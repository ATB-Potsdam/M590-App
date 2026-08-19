import {useRegisterSW} from "virtual:pwa-register/react";
import {fetchServerVersion, setSwRegistration} from "../lib/swRegistration";
import {isNative} from "../lib/nativeShare";
import "./UpdateBanner.scss";

/**
 * In the native shell the service worker is pure overhead and actively
 * misleading, so it is never registered there.
 *
 * Capacitor serves the bundled assets from https://localhost, so SWs *work* in
 * the WebView — which is the problem. On a fresh Play Store install the new
 * assets register a new worker while the previous install's controller is still
 * present (the WebView data directory survives an app update), so the
 * "installed + controller" test below fires and the banner claimed an update was
 * available immediately after updating from the Play Store. It was reporting a
 * service-worker change, not a newer version: the assets on screen were already
 * the new ones, and there is nothing to fetch — updates arrive through the Play
 * Store, not over HTTP. Precaching local files and polling the network every ten
 * minutes bought nothing either; native assets are on disk, so offline use does
 * not depend on the SW.
 *
 * `useRegisterSW` is a hook and cannot be called conditionally, hence the split
 * into a wrapper plus the web-only implementation.
 */
export const UpdateBanner = () => (isNative() ? null : <UpdateBannerWeb />);

const UpdateBannerWeb = () => {
    const {needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker} = useRegisterSW({
        // Every route to the banner ends here, so this is the only place the
        // version check can live.
        //
        // Workbox calls this from TWO situations, and they are easy to conflate:
        //   1. a worker reaches `waiting` while the page is open (a deploy
        //      landing mid-session), and
        //   2. a worker is ALREADY waiting when the page registers — left over
        //      from an earlier visit, surfaced on the next load.
        //
        // An earlier fix guarded only our own `updatefound` listener, which is
        // case 1. Case 2 goes straight from Workbox's "waiting" event to
        // onNeedRefresh and bypassed the check entirely: a phone that reloaded
        // onto 0.1.51 still got a banner offering 0.1.51, because a worker from
        // a previous deploy was sitting there waiting. Guarding here covers both.
        //
        // Returning without setNeedRefresh(true) simply leaves the worker
        // waiting. That is safe precisely because of what was checked: it
        // precaches the SAME version, so whether it takes over on a later load
        // or keeps waiting, the assets are equivalent.
        onNeedRefresh() {
            // A new worker is not the same thing as a new version. Every deploy
            // rewrites sw.js — the precache manifest hashes move even when no
            // user-visible file did — so redeploying the same release still
            // installs a worker and would prompt for an update to what is
            // already running.
            //
            // NOTE the direction of this check. useRegisterSW calls
            // `setNeedRefresh(true)` itself and only THEN invokes this callback,
            // so the banner is already showing by the time we get here: the only
            // thing that works is switching it back OFF once the versions turn
            // out to match. An earlier attempt guarded a `setNeedRefresh(true)`
            // of its own, which the library had already performed — so it never
            // suppressed anything.
            //
            // fetchServerVersion() reads data/version.json, which the worker
            // never precaches, so the answer comes from the network rather than
            // from the cache being questioned. It returns null on any doubt
            // (offline, malformed, HTML fallback); treat that as "cannot rule it
            // out" and leave the banner up, so an unreachable server never hides
            // a genuine update.
            //
            // Leaving the worker waiting is safe precisely because the versions
            // match: it precaches the same assets, so whether it takes over on a
            // later load or keeps waiting, nothing the user sees differs.
            void fetchServerVersion().then((serverVersion) => {
                if (serverVersion === __APP_VERSION__) setNeedRefresh(false);
            });
        },
        onRegisteredSW(_swUrl, registration) {
            if (!registration) return;
            setSwRegistration(registration);
            setInterval(() => {
                registration.update().catch(() => {/* offline / transient */});
            }, 10 * 60 * 1000);
        },
        onRegisterError(error) {
            console.error("SW registration failed:", error);
        },
    });

    if (!needRefresh) return null;

    return (
        <div className="update-banner">
            <span className="update-banner__text">Update verfügbar</span>
            <button
                className="update-banner__btn update-banner__btn--primary"
                onClick={() => updateServiceWorker(true)}
            >
                Aktualisieren
            </button>
            <button
                className="update-banner__btn"
                onClick={() => updateServiceWorker(false)}
                aria-label="Schließen"
            >
                ✕
            </button>
        </div>
    );
};
