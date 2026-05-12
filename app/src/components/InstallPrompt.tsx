import {useEffect, useState} from "react";
import {isNative} from "../lib/nativeShare";
import {useLocalStore} from "../stores/useLocalStore";
import "./InstallPrompt.scss";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{outcome: "accepted" | "dismissed";}>;
}

const isStandalone = () =>
    window.matchMedia("(display-mode: standalone)").matches
    || (navigator as Navigator & {standalone?: boolean;}).standalone === true;

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
    && !(window as Window & {MSStream?: unknown;}).MSStream;

export const InstallPrompt = () => {
    const [dismissed, setDismissed] = useLocalStore((s) => s.dwa_install_prompt_dismissed);
    const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
    const [showIosOverlay, setShowIosOverlay] = useState(false);

    useEffect(() => {
        if (isNative() || isStandalone() || dismissed) return;
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferred(e as BeforeInstallPromptEvent);
        };
        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, [dismissed]);

    if (isNative() || isStandalone() || dismissed) return null;

    const iosEligible = isIOS();
    if (!deferred && !iosEligible) return null;

    const handleInstall = () => {
        if (deferred) {
            deferred.prompt();
            deferred.userChoice.finally(() => {
                setDismissed(true);
                setDeferred(null);
            });
            return;
        }
        if (iosEligible) {
            setShowIosOverlay(true);
        }
    };

    const handleDismiss = () => {
        setDismissed(true);
        setDeferred(null);
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

            {showIosOverlay && (
                <div className="install-prompt-overlay" onClick={handleDismiss}>
                    <div className="install-prompt-overlay__card" onClick={(e) => e.stopPropagation()}>
                        <h3>Zum Startbildschirm hinzufügen</h3>
                        <ol>
                            <li>
                                In Safari unten auf <strong>Teilen</strong> tippen
                                <span className="install-prompt-overlay__icon" aria-hidden> ⬆️</span>
                            </li>
                            <li>
                                <strong>„Zum Home-Bildschirm"</strong> wählen
                                <span className="install-prompt-overlay__icon" aria-hidden> ➕</span>
                            </li>
                            <li>Mit <strong>„Hinzufügen"</strong> bestätigen</li>
                        </ol>
                        <button
                            className="install-prompt-overlay__close"
                            onClick={handleDismiss}
                        >
                            Verstanden
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};
