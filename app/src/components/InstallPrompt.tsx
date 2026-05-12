import {useState} from "react";
import {useInstallApp} from "../hooks/useInstallApp";
import {useLocalStore} from "../stores/useLocalStore";
import {IosInstallOverlay} from "./IosInstallOverlay";
import "./InstallPrompt.scss";

export const InstallPrompt = () => {
    const [dismissed, setDismissed] = useLocalStore((s) => s.dwa_install_prompt_dismissed);
    const {alreadyInstalled, isIOS, canPrompt, prompt} = useInstallApp();
    const [showIosOverlay, setShowIosOverlay] = useState(false);

    if (alreadyInstalled || dismissed) return null;
    if (!canPrompt && !isIOS) return null;

    const handleInstall = () => {
        if (canPrompt) {
            prompt().finally(() => setDismissed(true));
            return;
        }
        if (isIOS) setShowIosOverlay(true);
    };

    const handleDismiss = () => {
        setDismissed(true);
        setShowIosOverlay(false);
    };

    return (
        <>
            <div className="install-prompt">
                <span className="install-prompt__text">App auf Startbildschirm hinzufügen</span>
                <button
                    className="install-prompt__btn install-prompt__btn--primary"
                    onClick={handleInstall}
                >
                    Installieren
                </button>
                <button
                    className="install-prompt__btn"
                    onClick={handleDismiss}
                    aria-label="Schließen"
                >
                    ✕
                </button>
            </div>

            {showIosOverlay && <IosInstallOverlay onClose={handleDismiss} />}
        </>
    );
};
