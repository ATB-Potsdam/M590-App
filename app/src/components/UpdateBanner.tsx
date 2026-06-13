import {useRegisterSW} from "virtual:pwa-register/react";
import "./UpdateBanner.scss";

export const UpdateBanner = () => {
    const {needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker} = useRegisterSW({
        onRegisteredSW(_swUrl, registration) {
            if (!registration) return;
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
