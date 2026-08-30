#!/usr/bin/env node
//
// Capture Play Store phone screenshots from the built app, headlessly.
//
// Usage:
//   node scripts/captureScreenshots.mjs [--out DIR] [--port N] [--keep]
//
// Serves app/dist on a throwaway static server, drives system Chromium over the
// DevTools protocol and writes PNGs to app/store/listings/de-DE/phoneScreenshots/.
// Run `yarn build` first; this never builds, so what you see is what shipped.
//
// Chromium is launched as its OWN instance on its OWN port with a scratch
// profile, and only that instance is killed. Never point this at a running
// browser: the user has scripts bound to a persistent one.
//
// Why raw CDP and not puppeteer: no dependency to install or keep current, and
// the whole surface used here is four commands. Node built-ins only.
//
// KNOWN LIMIT, and the reason for the seeding below: the WASM polygon lookup and
// the .bin climate rasters do not load in this headless environment, so
// precipitationLookup/et0Lookup stay null and seedDemoData() creates nothing.
// Screenshots of populated pages therefore seed localStorage directly with
// fully-formed records (climate values inlined, *Status: "done") rather than
// calling the app's own demo loader.

import {createServer} from "node:http";
import {spawn} from "node:child_process";
import {createHash} from "node:crypto";
import {readFile, writeFile, mkdir, readdir} from "node:fs/promises";
import {existsSync} from "node:fs";
import {connect} from "node:net";
import {extname, join, dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(REPO, "app/dist");
const DEFAULT_OUT = join(REPO, "app/store/listings/de-DE/phoneScreenshots");

// Play requires 320-3840 px on each edge and at most a 2:1 ratio.
//
// The CSS width must be a real phone width, not the output width: the app
// switches to the mobile layout (bottom navigation) at max-width 720px, so
// capturing at 1080 CSS px yields desktop screenshots with a top nav — not what
// a phone user sees. 360x640 CSS at deviceScaleFactor 3 renders the mobile
// layout and still writes a 1080x1920 PNG.
const VIEWPORT = {width: 360, height: 640, scale: 3};

const args = process.argv.slice(2);
const flag = (name, fallback) => {
    const i = args.indexOf(name);
    return i === -1 ? fallback : args[i + 1];
};
const OUT = resolve(flag("--out", DEFAULT_OUT));
const PORT = Number(flag("--port", "9333"));
const KEEP = args.includes("--keep");

const die = (msg) => { console.error(`SCREENSHOTS ABORTED: ${msg}`); process.exit(1); };
const info = (msg) => console.log(`==> ${msg}`);

// --- Seed data ---------------------------------------------------------------

// Shaped to match src/types/farm.ts exactly. A malformed Field crashes FarmPage
// into its ErrorBoundary instead of rendering, which would silently produce a
// screenshot of an error page — hence the explicit nested `location` and the
// "done" status flags that tell the app not to re-fetch what it cannot load here.
const MONTHS = (v) => Array.from({length: 12}, (_, i) => v[i] ?? 0);

const seedField = (id, name, lat, lon, areaHa, nFkwe) => ({
    id,
    name,
    location: {lat, lon},
    areaHa,
    nFkweClass: nFkwe,
    nFkweClassSource: "geo",
    climateClass: "C",
    climateClassStatus: "done",
    climateDataStatus: "done",
    climateData: {
        precipitation: MONTHS([42, 34, 41, 33, 55, 62, 74, 63, 48, 41, 44, 48]),
        et0: MONTHS([9, 16, 38, 65, 95, 104, 108, 92, 57, 29, 11, 7]),
    },
});

const SEED = {
    farm: {
        name: "Gut Beispielhof",
        fields: [
            seedField("f1", "Acker Nord", 52.39, 13.06, 12.5, "3a"),
            seedField("f2", "Golfplatz Süd", 52.37, 13.09, 4.2, "4"),
        ],
    },
    projects: [{
        id: "p1",
        name: "Bewässerung 2026",
        createdAt: "2026-03-01T09:00:00.000Z",
        updatedAt: "2026-03-01T09:00:00.000Z",
        // Note: fieldAssignments, not "assignments" — see src/types/project.ts.
        // The wrong key does not throw, it just renders "ohne Feldzuweisung".
        fieldAssignments: [
            {
                id: "a1", fieldId: "f1", module: "hauptkulturen",
                plantCategory: "Hackfruechte", plantKey: "Kartoffeln",
                surchargeIntermediate: false, surchargeEmergence: 0,
                surchargeHeavySoil: 0, isTablePotato: true,
            },
            {
                // altWasserM3 is required for the sport/green modules; without it
                // the row renders a "Fehlt:" warning instead of a result.
                id: "a2", fieldId: "f2", module: "golf",
                golfAreaMode: "18hole", altWasserM3: 1500,
                surchargeIntermediate: false, surchargeEmergence: 0,
                surchargeHeavySoil: 0,
            },
        ],
    }],
};

// The pages worth showing in the listing, in the order Play displays them.
const SHOTS = [
    {name: "01-projekte", path: "/", waitMs: 3500},
    {name: "02-flaechen", path: "/farm", waitMs: 3500},
    {name: "03-szenario", path: "/projects/p1", waitMs: 4000},
    {name: "04-zuweisung", path: "/projects/p1/assignment/a1", waitMs: 4500},
];

// --- Minimal static server ---------------------------------------------------

const MIME = {
    ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
    ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
    ".woff2": "font/woff2", ".wasm": "application/wasm", ".fgb": "application/octet-stream",
    ".bin": "application/octet-stream",
};

const serve = () => new Promise((res) => {
    const server = createServer((req, rep) => {
        const url = decodeURIComponent(req.url.split("?")[0]);
        let file = join(DIST, url === "/" ? "index.html" : url.replace(/^\//, ""));
        // SPA fallback: react-router owns the deep paths, so anything without a
        // file extension has to come back as index.html or the route 404s.
        if (!existsSync(file) || !extname(file)) file = join(DIST, "index.html");
        readFile(file)
            .then((buf) => {
                rep.writeHead(200, {"Content-Type": MIME[extname(file)] ?? "application/octet-stream"});
                rep.end(buf);
            })
            .catch(() => { rep.writeHead(404); rep.end("not found"); });
    });
    server.listen(0, "127.0.0.1", () => res({server, port: server.address().port}));
});

// --- Hand-rolled CDP client --------------------------------------------------
//
// One WebSocket, text frames only, payloads well under 64 KiB except the
// screenshot reply — so the frame reader handles the 16-bit and 64-bit length
// forms, and the client never masks... no: a client MUST mask (RFC 6455), so it
// does, with a fixed key since this is loopback.

const httpGet = (url) => new Promise((res, rej) => {
    import("node:http").then(({get}) => {
        get(url, (r) => {
            let body = "";
            r.on("data", (c) => (body += c));
            r.on("end", () => res(body));
        }).on("error", rej);
    });
});

const wsConnect = (wsUrl) => new Promise((res, rej) => {
    const {hostname, port, pathname} = new URL(wsUrl);
    const key = createHash("md5").update(String(Date.now())).digest("base64");
    const sock = connect(Number(port), hostname, () => {
        sock.write(
            `GET ${pathname} HTTP/1.1\r\nHost: ${hostname}:${port}\r\n` +
            `Upgrade: websocket\r\nConnection: Upgrade\r\n` +
            `Sec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\n\r\n`
        );
    });
    sock.once("data", (chunk) => {
        if (!chunk.toString().startsWith("HTTP/1.1 101")) return rej(new Error("CDP upgrade refused"));
        res(sock);
    });
    sock.on("error", rej);
});

const frame = (text) => {
    const payload = Buffer.from(text);
    const mask = Buffer.from([1, 2, 3, 4]);
    const len = payload.length;
    let header;
    if (len < 126) header = Buffer.from([0x81, 0x80 | len]);
    else if (len < 65536) header = Buffer.concat([Buffer.from([0x81, 0xfe]), (() => {
        const b = Buffer.alloc(2); b.writeUInt16BE(len); return b;
    })()]);
    else header = Buffer.concat([Buffer.from([0x81, 0xff]), (() => {
        const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(len)); return b;
    })()]);
    const masked = Buffer.from(payload.map((b, i) => b ^ mask[i % 4]));
    return Buffer.concat([header, mask, masked]);
};

// Server-to-client frames are never masked, and CDP replies can span TCP reads,
// so buffer until a whole frame is present.
const makeReader = (sock, onMessage) => {
    let buf = Buffer.alloc(0);
    sock.on("data", (chunk) => {
        buf = Buffer.concat([buf, chunk]);
        for (;;) {
            if (buf.length < 2) return;
            const len0 = buf[1] & 0x7f;
            let off = 2, len = len0;
            if (len0 === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
            else if (len0 === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
            if (buf.length < off + len) return;
            const payload = buf.subarray(off, off + len).toString();
            buf = buf.subarray(off + len);
            if (payload) onMessage(payload);
        }
    });
};

const makeClient = (sock) => {
    let id = 0;
    const pending = new Map();
    makeReader(sock, (raw) => {
        let msg;
        try { msg = JSON.parse(raw); } catch { return; }
        const p = pending.get(msg.id);
        if (!p) return;
        pending.delete(msg.id);
        msg.error ? p.rej(new Error(msg.error.message)) : p.res(msg.result);
    });
    return (method, params = {}) => new Promise((res, rej) => {
        const mid = ++id;
        pending.set(mid, {res, rej});
        sock.write(frame(JSON.stringify({id: mid, method, params})));
        setTimeout(() => {
            if (pending.delete(mid)) rej(new Error(`CDP timeout: ${method}`));
        }, 30000);
    });
};

// --- Main --------------------------------------------------------------------

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const main = async () => {
    if (!existsSync(join(DIST, "index.html"))) {
        die(`app/dist is missing or empty — run "yarn build" in app/ first.`);
    }
    const chromium = ["/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome-stable"]
        .find((p) => existsSync(p));
    if (!chromium) die("no chromium/chrome found");

    await mkdir(OUT, {recursive: true});
    const {server, port: httpPort} = await serve();
    info(`serving app/dist on 127.0.0.1:${httpPort}`);

    const profile = join(REPO, ".screenshot-profile");
    const browser = spawn(chromium, [
        "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
        `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
        `--window-size=${VIEWPORT.width * VIEWPORT.scale},${VIEWPORT.height * VIEWPORT.scale}`,
        "about:blank",
    ], {stdio: "ignore"});

    const cleanup = () => {
        // Only ever the instance started here — see the header note.
        try { browser.kill("SIGTERM"); } catch { /* already gone */ }
        server.close();
    };
    process.on("exit", cleanup);
    process.on("SIGINT", () => { cleanup(); process.exit(130); });

    // The debugging port is not up the instant the process is.
    let target = null;
    for (let i = 0; i < 50 && !target; i++) {
        await wait(200);
        try {
            const list = JSON.parse(await httpGet(`http://127.0.0.1:${PORT}/json`));
            target = list.find((t) => t.type === "page");
        } catch { /* not listening yet */ }
    }
    if (!target) die(`Chromium did not open a debugging port on ${PORT}`);

    const sock = await wsConnect(target.webSocketDebuggerUrl);
    const cdp = makeClient(sock);
    await cdp("Page.enable");
    await cdp("Runtime.enable");
    await cdp("Emulation.setDeviceMetricsOverride", {
        width: VIEWPORT.width, height: VIEWPORT.height,
        deviceScaleFactor: VIEWPORT.scale, mobile: true,
    });

    // Seed before any app code runs, on every document — a reload or an
    // in-app navigation must not land on an empty store.
    await cdp("Page.addScriptToEvaluateOnNewDocument", {
        source: `
            try {
                localStorage.setItem("dwa_farm", ${JSON.stringify(JSON.stringify(SEED.farm))});
                localStorage.setItem("dwa_projects", ${JSON.stringify(JSON.stringify(SEED.projects))});
                // Suppress the first-run overlay, the tour offer and the install
                // banner: each covers the UI the screenshot is meant to show.
                localStorage.setItem("dwa_tour_completed", "true");
                localStorage.setItem("dwa_onboarding_dismissed", "true");
                localStorage.setItem("dwa_banner_dismissed", "true");
                localStorage.setItem("dwa_install_prompt_dismissed", "true");
            } catch (e) { /* storage unavailable; page still renders */ }
        `,
    });

    const written = [];
    for (const shot of SHOTS) {
        const url = `http://127.0.0.1:${httpPort}${shot.path}`;
        await cdp("Page.navigate", {url});
        await wait(shot.waitMs);

        // Fail loudly on an ErrorBoundary rather than shipping a screenshot of a
        // crash to the store listing.
        const {result} = await cdp("Runtime.evaluate", {
            expression: `document.body.innerText.includes("Etwas ist schiefgelaufen")`,
            returnByValue: true,
        });
        if (result.value === true) die(`${shot.path} rendered the error boundary — seed data no longer matches the app's types`);

        // A route change keeps the previous scroll offset, so a deep page can be
        // captured mid-content. Start every shot at the top of the page.
        await cdp("Runtime.evaluate", {expression: `window.scrollTo(0, 0)`});
        await wait(400);

        const {data} = await cdp("Page.captureScreenshot", {format: "png"});
        const file = join(OUT, `${shot.name}.png`);
        await writeFile(file, Buffer.from(data, "base64"));
        written.push(file);
        info(`captured ${shot.name}.png`);
    }

    cleanup();
    if (!KEEP) {
        // Chromium still holds files in the profile for a moment after SIGTERM;
        // removing it immediately races that and fails with ENOTEMPTY. The
        // screenshots are already on disk, so a leftover profile is untidy, not
        // a failure — retry briefly, then let it be.
        const {rm} = await import("node:fs/promises");
        for (let i = 0; i < 10; i++) {
            try { await rm(profile, {recursive: true, force: true}); break; }
            catch { await wait(200); }
        }
    }
    info(`${written.length} screenshot(s) in ${OUT}`);
    const leftover = (await readdir(OUT)).filter((f) => f.endsWith(".png"));
    info(`listing now holds: ${leftover.join(", ")}`);
};

main().catch((e) => die(e.message));
