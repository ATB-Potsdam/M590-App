let cached: ServiceWorkerRegistration | null = null;

export const setSwRegistration = (reg: ServiceWorkerRegistration) => {
    cached = reg;
};

export const getSwRegistration = (): ServiceWorkerRegistration | null => cached;

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
