let cached: ServiceWorkerRegistration | null = null;

export const setSwRegistration = (reg: ServiceWorkerRegistration) => {
    cached = reg;
};

export const getSwRegistration = (): ServiceWorkerRegistration | null => cached;

const LAST_VERSION_KEY = "dwa_last_running_version";

/** Numeric compare of dotted versions; non-numeric parts count as 0. */
const compareVersions = (a: string, b: string): number => {
    const pa = a.split(".").map((n) => Number.parseInt(n, 10) || 0);
    const pb = b.split(".").map((n) => Number.parseInt(n, 10) || 0);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
        const d = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (d !== 0) return d < 0 ? -1 : 1;
    }
    return 0;
};

/**
 * Record the version that just loaded successfully.
 *
 * Cheap and local, and it turns the next start into a decidable question: if the
 * bundle that comes up is OLDER than the one that ran here last time, the client
 * has gone backwards, which only a stale cache can cause. That is a stronger
 * signal than any server comparison — it needs no network and cannot be confused
 * by a deploy that happens mid-session.
 */
export const rememberRunningVersion = (version: string): void => {
    try {
        localStorage.setItem(LAST_VERSION_KEY, version);
    } catch {
        // Private mode / quota. Detection degrades to the server comparison.
    }
};

/**
 * The value of the marker as it was when this module first loaded.
 *
 * Captured once, at import time, because `rememberRunningVersion()` overwrites
 * the marker as soon as the app finishes loading — which happens in the same
 * mount pass as the detection below. Reading `localStorage` lazily would race
 * against that write and always see the current version, never the previous one.
 */
const versionAtStartup: string | null = (() => {
    try {
        return localStorage.getItem(LAST_VERSION_KEY);
    } catch {
        return null;
    }
})();

/**
 * True when the running bundle is older than the one last seen on this device.
 *
 * A downgrade is never legitimate here: releases only move forward, and the
 * store is per-origin, so this cannot be tripped by another deployment. Anything
 * unreadable or equal/newer returns false.
 */
export const hasDowngraded = (runningVersion: string): boolean =>
    !!versionAtStartup && compareVersions(runningVersion, versionAtStartup) < 0;

/**
 * The version the server is currently serving, or null if it cannot be
 * established.
 *
 * Read from `data/version.json`, which the build emits into the one directory
 * the service worker never caches — so this is the live figure even when the
 * rest of the app is being served from a stale worker's cache. `cache: "no-store"`
 * guards against the HTTP cache on top of that.
 *
 * Returns null rather than throwing on any doubt (offline, 404 from a server that
 * predates this file, HTML from a fallback, malformed JSON). Callers must treat
 * null as "do not act": a wrong answer here triggers an unnecessary reset.
 */
export const fetchServerVersion = (): Promise<string | null> => {
    const url = `${import.meta.env.BASE_URL}data/version.json`.replace(/\/+/g, "/");
    return fetch(url, {cache: "no-store"})
        .then((r) => {
            if (!r.ok) return null;
            // A stale worker's navigation fallback answers with index.html; the
            // 0.1.45 denylist stops that, but older workers are exactly the ones
            // we are trying to detect, so do not trust the status alone.
            if (!(r.headers.get("content-type") ?? "").includes("application/json")) return null;
            return r.json() as Promise<{version?: unknown}>;
        })
        .then((d) => (d && typeof d.version === "string" ? d.version : null))
        .catch(() => null);
};

/**
 * True when the bundle running here is not the one the server serves.
 *
 * Deliberately just a version comparison: at page load any mismatch should be
 * resolved without asking, whether the worker has an update staged or believes
 * itself current. See the note inside for why the worker state used to be
 * consulted and why that was wrong.
 */
export const isStuckOnOldVersion = (runningVersion: string): Promise<boolean> =>
    fetchServerVersion().then((serverVersion) =>
        // Any mismatch at startup counts, whatever the worker's state.
        //
        // An earlier version bailed out when a worker was already `waiting`, on
        // the reasoning that the banner could finish the job. That was wrong: it
        // is precisely the common case — a new deploy leaves a waiting worker —
        // so the mismatch surfaced as a banner on a *fresh start*, asking the
        // user to confirm an update to a version they had never seen. The banner
        // belongs to a deploy that lands mid-session, not to page load.
        !!serverVersion && serverVersion !== runningVersion);

/**
 * Remove any service worker left behind in the native WebView.
 *
 * Not registering one (since 0.1.43) is not the same as not having one: the
 * Capacitor WebView keeps its data directory across app updates, so a worker
 * registered by an install from before that change is still active and still
 * controls the page. It then serves that old install's precached bundle, which
 * is how a freshly installed Play Store version can come up as the previous
 * release and ask to be updated.
 *
 * Unregistering alone would leave the caches, and the next worker would adopt
 * them, so the caches go too. Nothing on native depends on either: the assets
 * are on disk in the APK.
 *
 * Returns true when something was actually removed, i.e. the page is currently
 * being served by a worker that should not exist and the caller should reload.
 */
export const purgeNativeServiceWorker = (): Promise<boolean> => {
    if (!("serviceWorker" in navigator)) return Promise.resolve(false);

    return navigator.serviceWorker.getRegistrations()
        .then((regs) => {
            if (regs.length === 0) return false;
            return Promise.all(regs.map((r) => r.unregister()))
                .then(() => ("caches" in window
                    ? caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k))))
                    : Promise.resolve([])))
                // Only worth reloading if a worker was actually controlling this
                // page; an idle registration can be dropped silently.
                .then(() => !!navigator.serviceWorker.controller);
        })
        .catch(() => false);
};

/**
 * Unregister every service worker, purge every cache, then reload.
 *
 * This is the "Shift-Reload" a user would otherwise have to know about. A plain
 * reload cannot help when the installed worker is the thing serving stale files:
 * it answers the reload from its own cache. The worker has to go first.
 *
 * Needed because a worker can end up in a state that shows neither an update
 * banner (nothing is `waiting`, so `needRefresh` never becomes true) nor a
 * working app — leaving no route out from inside the UI.
 */
export const hardResetAndReload = (): Promise<void> => {
    const reload = () => window.location.reload();

    if (!("serviceWorker" in navigator)) {
        reload();
        return Promise.resolve();
    }

    return navigator.serviceWorker.getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .then(() => ("caches" in window
            ? caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
            : Promise.resolve([])))
        .then(() => reload(), () => reload());
};

/**
 * Bring the page onto the newest available version, without asking.
 *
 * Prefers the gentle route: if a worker is already waiting, tell it to take over
 * and reload — that is what the "Aktualisieren" button does, minus the button.
 * Only when no update is staged (the stuck case, where the worker believes it is
 * current) does it fall back to unregistering and purging.
 *
 * Either way the page ends up on the version the server serves.
 */
export const forceUpdateAndReload = (): Promise<void> => {
    if (!("serviceWorker" in navigator)) {
        window.location.reload();
        return Promise.resolve();
    }

    return navigator.serviceWorker.getRegistration()
        .then((reg) => {
            const waiting = reg?.waiting;
            if (!waiting) return hardResetAndReload();

            // controllerchange fires once the waiting worker takes over; reload
            // then so the page is served by it. The timeout is a safety net —
            // a worker that never activates must not leave the app hanging on
            // the old version forever.
            return new Promise<void>((resolve) => {
                let done = false;
                const go = () => {
                    if (done) return;
                    done = true;
                    window.location.reload();
                    resolve();
                };
                navigator.serviceWorker.addEventListener("controllerchange", go, {once: true});
                waiting.postMessage({type: "SKIP_WAITING"});
                setTimeout(go, 3000);
            });
        })
        .catch(() => hardResetAndReload());
};

