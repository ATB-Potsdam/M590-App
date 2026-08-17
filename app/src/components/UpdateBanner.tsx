import {useRegisterSW} from "virtual:pwa-register/react";
import {setSwRegistration} from "../lib/swRegistration";
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

            // If a waiting worker is already there at registration time
            // (e.g. user came back to a tab where the update happened in
            // the background), surface the banner immediately.
            if (registration.waiting) {
                setNeedRefresh(true);
            }
            registration.addEventListener("updatefound", () => {
                const newWorker = registration.installing;
                if (!newWorker) return;
                newWorker.addEventListener("statechange", () => {
                    if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                        setNeedRefresh(true);
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
