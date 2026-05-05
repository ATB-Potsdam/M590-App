import {useRegisterSW} from "virtual:pwa-register/react";
import "./UpdateBanner.scss";

export const UpdateBanner = () => {
    const {needRefresh: [needRefresh], updateServiceWorker} = useRegisterSW();

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
