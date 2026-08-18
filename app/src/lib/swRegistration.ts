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
 * True when the running bundle is older than what the server serves *and* the
 * normal update path has not resolved it.
 *
 * This is the deadlock signature: the worker keeps serving an old bundle while
 * nothing is `waiting`, so `needRefresh` never fires and no banner appears. A
 * version mismatch on its own is NOT enough — during a normal update there is a
 * waiting worker and the banner handles it, which is the common case and must
 * not trigger a reset.
 */
export const isStuckOnOldVersion = (runningVersion: string): Promise<boolean> =>
    fetchServerVersion().then((serverVersion) => {
        if (!serverVersion || serverVersion === runningVersion) return false;
        if (!("serviceWorker" in navigator)) return false;
        return navigator.serviceWorker.getRegistration()
            .then((reg) => {
                // No worker at all: a plain reload will pick up the new bundle,
                // no need for the heavy hammer.
                if (!reg) return false;
                // An update is already staged — the banner can finish the job.
                if (reg.waiting || reg.installing) return false;
                // Ask the server one more time. If this turns up an update the
                // normal path takes over on the next tick.
                return reg.update()
                    .then(() => !reg.waiting && !reg.installing)
                    .catch(() => true);
            })
            .catch(() => false);
    });

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
