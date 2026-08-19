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
        onRegisteredSW(_swUrl, registration) {
            if (!registration) return;
            setSwRegistration(registration);
            setInterval(() => {
                registration.update().catch(() => {/* offline / transient */});
            }, 10 * 60 * 1000);

            // Deliberately NOT surfacing an already-waiting worker here. A
            // mismatch that exists at startup is handled in App.tsx, which
            // resets and reloads silently — asking the user to click
            // "Aktualisieren" for something they never saw change is noise, and
            // in the stuck case the banner could not fix it anyway (nothing is
            // `waiting`, so it never appeared). The banner is reserved for a
            // deploy that lands while the app is open, which the updatefound
            // listener below catches — and then only when the version actually
            // moved, see there.
            registration.addEventListener("updatefound", () => {
                const newWorker = registration.installing;
                if (!newWorker) return;
                newWorker.addEventListener("statechange", () => {
                    if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                        // A new worker is not the same thing as a new version.
                        // Every deploy rewrites sw.js (the precache manifest hashes
                        // change even when no user-visible file did), so redeploying
                        // the same release still installs a worker and would prompt
                        // every open session to "update" to what it is already
                        // running. Ask the server what it serves and stay silent
                        // when it matches.
                        //
                        // fetchServerVersion() reads data/version.json, which the
                        // worker never precaches, so this is the live figure and not
                        // an answer from the cache we are asking about. It returns
                        // null on any doubt (offline, malformed, HTML fallback) —
                        // treat that as "cannot rule it out" and show the banner, so
                        // an unreachable server never hides a genuine update.
                        // Suppressing leaves the new worker `waiting` (registerType
                        // is 'prompt', so nothing calls skipWaiting for it). That is
                        // harmless here and specifically because of what was just
                        // checked: it precaches the SAME version, so whether it
                        // takes over on a later load or keeps waiting, the assets
                        // are equivalent. Nobody can be stranded on stale content by
                        // a prompt we withheld.
                        void fetchServerVersion().then((serverVersion) => {
                            if (serverVersion === __APP_VERSION__) return;
                            setNeedRefresh(true);
                        });
                    }
                });
            });
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
