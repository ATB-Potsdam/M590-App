#!/usr/bin/env node
//
// Capture Play Store phone screenshots from the built app, headlessly.
//
// Usage:
//   node scripts/captureScreenshots.mjs [--locale L] [--port N] [--keep]
//                                       [--devices phone,sevenInch,tenInch]
//
// Serves app/dist on a throwaway static server, drives system Chromium over the
// DevTools protocol and writes PNGs into app/store/listings/<locale>/, one
// directory per device kind — the same directory names deployAndroid.py's
// IMAGE_KINDS expects (phoneScreenshots, sevenInchScreenshots,
// tenInchScreenshots), so a capture run feeds the publisher directly.
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
const LISTINGS = join(REPO, "app/store/listings");

// Play requires 320-3840 px on each edge and at most a 2:1 ratio, and it keeps
// phone, 7-inch and 10-inch screenshots as three separate image kinds.
//
// Each is captured at a real device CSS size, never at the output pixel size:
// the layout is driven by CSS width, so rendering at 1080 CSS px would produce
// a *desktop* screenshot filed under "phone". The nav sits at the bottom on
// mobile and moves to the top at min-width 900px ($nav-top-breakpoint in
// app/src/App.scss), and .page caps its content at 720px. Hence:
//   phone    360x640  @3 -> 1080x1920, bottom nav, single column
//   7-inch   600x960  @2 -> 1200x1920, bottom nav, the same touch layout wider
//   10-inch  1280x800 @2 -> 2560x1600, top nav — the desktop-wide layout a 10"
//            tablet really renders, in the landscape those are usually used in
const DEVICES = {
    phone:     {dir: "phoneScreenshots",     width: 360,  height: 640, scale: 3, mobile: true},
    sevenInch: {dir: "sevenInchScreenshots", width: 600,  height: 960, scale: 2, mobile: true},
    tenInch:   {dir: "tenInchScreenshots",   width: 1280, height: 800, scale: 2, mobile: false},
};

const args = process.argv.slice(2);
const flag = (name, fallback) => {
    const i = args.indexOf(name);
    return i === -1 ? fallback : args[i + 1];
};
const LOCALE = flag("--locale", "de-DE");
const PORT = Number(flag("--port", "9333"));
const KEEP = args.includes("--keep");
const DEVICE_KEYS = flag("--devices", Object.keys(DEVICES).join(","))
    .split(",").map((k) => k.trim()).filter(Boolean);

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
                //
                // golfAreaMode alone does NOT produce a result: getAssignmentResult
                // dispatches on the three explicit sub-area values, and the mode is
                // only the UI shortcut that fills them (TABLE_35 in golf.ts, applied
                // by the mode buttons in AssignmentPage). Seeding the mode without
                // them stores exactly what the app never stores, and the row renders
                // an empty "–" instead of its Jahresrichtwert.
                id: "a2", fieldId: "f2", module: "golf",
                golfAreaMode: "18hole",
                golfGreensM2: 18000, golfTeeM2: 11700, golfFairwayM2: 176000,
                altWasserM3: 1500,
                surchargeIntermediate: false, surchargeEmergence: 0,
                surchargeHeavySoil: 0,
            },
        ],
    }],
};

// The pages worth showing in the listing, in the order Play displays them.
//
// `prepare` runs in the page after it has settled and before the capture. It
// returns nothing; anything it needs to report goes through an exception, which
// aborts the run. `scrollTo` names a selector to bring to the top of the
// viewport instead of the default "scroll back to 0".
const SHOTS = [
    {name: "01-projekte", path: "/", waitMs: 3500},
    {name: "02-flaechen", path: "/farm", waitMs: 3500},
    {name: "03-szenario", path: "/projects/p1", waitMs: 4000},
    {name: "04-zuweisung", path: "/projects/p1/assignment/a1", waitMs: 4500},
    {
        // The payoff screen: total demand across all areas.
        //
        // The per-area table lives in a collapsed <details>
        // (ProjectDetailPage.tsx) and is only opened where it fits. On a 360 px
        // phone the table scrolls horizontally — the numbers are cut mid-digit —
        // and its two footnotes push the Netto-Antragsmenge and the PDF Export
        // button off the bottom, so opening it costs the shot its payoff and
        // shows clipped values instead. Closed, everything that matters fits.
        // Tablets have the width for the full breakdown, so there it is opened.
        name: "05-zusammenfassung",
        path: "/projects/p1",
        waitMs: 4000,
        prepare: (device) => device.mobile && device.width < 600 ? null : `
            const d = document.querySelector(".project-summary__details");
            if (!d) throw new Error("summary <details> not found");
            d.open = true;
        `,
        // Anchor on the section, not the page top: the summary sits below the
        // assignment list and would otherwise be off-screen.
        scrollTo: ".project-summary",
        // Opening <details> reflows the page; let it settle before capturing.
        afterPrepareMs: 900,
    },
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

    const unknown = DEVICE_KEYS.filter((k) => !DEVICES[k]);
    if (unknown.length) die(`unknown device(s): ${unknown.join(", ")} — known: ${Object.keys(DEVICES).join(", ")}`);

    const {server, port: httpPort} = await serve();
    info(`serving app/dist on 127.0.0.1:${httpPort}`);

    // The window size only has to be big enough not to constrain anything;
    // Emulation.setDeviceMetricsOverride is what actually sets each device's
    // viewport, and it is re-issued per device below.
    const widest = Math.max(...DEVICE_KEYS.map((k) => DEVICES[k].width * DEVICES[k].scale));
    const tallest = Math.max(...DEVICE_KEYS.map((k) => DEVICES[k].height * DEVICES[k].scale));
    const profile = join(REPO, ".screenshot-profile");
    const browser = spawn(chromium, [
        "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
        `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
        `--window-size=${widest},${tallest}`,
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

    // Evaluate an expression and surface a thrown error as a failed run rather
    // than letting it pass silently — a `prepare` that no longer matches the DOM
    // must not quietly ship a screenshot of the wrong thing.
    const evaluate = async (expression, what) => {
        const res = await cdp("Runtime.evaluate", {expression, returnByValue: true, awaitPromise: true});
        if (res.exceptionDetails) {
            const msg = res.exceptionDetails.exception?.description
                ?? res.exceptionDetails.text ?? "unknown error";
            die(`${what}: ${msg.split("\n")[0]}`);
        }
        return res.result;
    };

    const written = [];
    for (const key of DEVICE_KEYS) {
        const device = DEVICES[key];
        const out = join(LISTINGS, LOCALE, device.dir);
        await mkdir(out, {recursive: true});
        await cdp("Emulation.setDeviceMetricsOverride", {
            width: device.width, height: device.height,
            deviceScaleFactor: device.scale, mobile: device.mobile,
        });
        info(`--- ${key}: ${device.width}x${device.height} CSS @${device.scale} -> ${device.width * device.scale}x${device.height * device.scale}`);

        for (const shot of SHOTS) {
            const url = `http://127.0.0.1:${httpPort}${shot.path}`;
            // Re-navigate even when the path is unchanged from the previous shot
            // (05 revisits 03's route): a fresh document guarantees the page is
            // in its default state and not still carrying 03's scroll or an
            // earlier `prepare`'s open <details>.
            await cdp("Page.navigate", {url: "about:blank"});
            await cdp("Page.navigate", {url});
            await wait(shot.waitMs);

            // Fail loudly on an ErrorBoundary rather than shipping a screenshot of a
            // crash to the store listing.
            const crashed = await evaluate(
                `document.body.innerText.includes("Etwas ist schiefgelaufen")`,
                `${key}/${shot.name}`,
            );
            if (crashed.value === true) die(`${shot.path} rendered the error boundary — seed data no longer matches the app's types`);

            // `prepare` may be a plain string or a function of the device — the
            // latter lets a shot opt out on a viewport where the extra content
            // does not fit. Returning null means "nothing to prepare here".
            const prepare = typeof shot.prepare === "function" ? shot.prepare(device) : shot.prepare;
            if (prepare) {
                await evaluate(`(() => {${prepare}})()`, `${key}/${shot.name} prepare`);
                await wait(shot.afterPrepareMs ?? 500);
            }

            // An incomplete assignment does not crash — it renders an empty "–"
            // cell, which looks like a deliberate layout and would ship a
            // half-blank summary to the store. The seed once did exactly that
            // (golfAreaMode without the sub-area values it is only a shortcut
            // for). So assert every data row carries at least one scenario value.
            //
            // Counting columns does not work here: a sport/green row collapses
            // Normal+Trocken into one colSpan=2 cell, and the optional "Alt.
            // Wasser" column is legitimately "–" on a crop row. What every
            // complete row does have is a value cell holding "m³/a".
            if (shot.name === "05-zusammenfassung") {
                const blank = await evaluate(`(() => {
                    const rows = document.querySelectorAll(".project-summary__table tbody tr");
                    if (!rows.length) throw new Error("summary table has no rows");
                    // textContent, not innerText: inside a closed <details> the
                    // rows are not laid out, and innerText — which is defined in
                    // terms of rendered text — comes back empty for all of them.
                    return [...rows]
                        .filter((tr) => !/m³\\/a/.test(tr.textContent))
                        .map((tr) => tr.querySelector("td").textContent.trim());
                })()`, `${key}/${shot.name} completeness`);
                if (blank.value?.length) {
                    die(`summary rows without a result: ${blank.value.join(", ")} — the seed no longer satisfies getAssignmentResult()`);
                }
            }

            // A route change keeps the previous scroll offset, so a deep page can be
            // captured mid-content. Start every shot at the top of the page, unless
            // it names a section to anchor on instead.
            if (shot.scrollTo) {
                await evaluate(`(() => {
                    const el = document.querySelector(${JSON.stringify(shot.scrollTo)});
                    if (!el) throw new Error("scrollTo target not found: " + ${JSON.stringify(shot.scrollTo)});
                    // The nav is fixed — at the top on the wide layout, at the
                    // bottom on mobile — so the usable band is the viewport minus
                    // whichever edge it occupies. scrollIntoView ignores that and
                    // would put the element under the top nav.
                    const nav = document.querySelector(".nav-bar-wrapper");
                    const navH = nav ? nav.offsetHeight : 0;
                    const atTop = nav && getComputedStyle(nav).top === "0px";
                    const top = atTop ? navH : 0;
                    const usable = window.innerHeight - navH;
                    const rect = el.getBoundingClientRect();
                    const absTop = rect.top + window.scrollY;
                    let y;
                    if (rect.height < usable) {
                        // Fits: centre it, so a short section is not left hugging
                        // one edge and clipped by the opposite one.
                        y = absTop - top - (usable - rect.height) / 2;
                    } else {
                        // Taller than the band, so something has to be cut. Anchor
                        // the BOTTOM, flush and without padding: on this page the
                        // section ends with the headline figure
                        // (Netto-Antragsmenge), and losing that to keep a heading
                        // in frame is the wrong trade for a store listing. Flush
                        // rather than padded because the overflow here is only a
                        // few px — every one of them buys back a line at the top.
                        y = absTop + rect.height - top - usable;
                    }
                    window.scrollTo({top: Math.max(0, y), behavior: "instant"});
                })()`, `${key}/${shot.name} scrollTo`);
            } else {
                await evaluate(`window.scrollTo(0, 0)`, `${key}/${shot.name} scroll`);
            }
            await wait(400);

            const {data} = await cdp("Page.captureScreenshot", {format: "png"});
            const file = join(out, `${shot.name}.png`);
            await writeFile(file, Buffer.from(data, "base64"));
            written.push(file);
            info(`captured ${key}/${shot.name}.png`);
        }
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
    info(`${written.length} screenshot(s) written`);
    for (const key of DEVICE_KEYS) {
        const dir = join(LISTINGS, LOCALE, DEVICES[key].dir);
        const held = (await readdir(dir)).filter((f) => f.endsWith(".png"));
        info(`${LOCALE}/${DEVICES[key].dir} now holds: ${held.join(", ")}`);
    }
};

main().catch((e) => die(e.message));
