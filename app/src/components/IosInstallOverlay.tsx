import "./InstallPrompt.scss";

interface Props {
    onClose: () => void;
}

export const IosInstallOverlay = ({onClose}: Props) => (
    <div className="install-prompt-overlay" onClick={onClose}>
        <div className="install-prompt-overlay__card" onClick={(e) => e.stopPropagation()}>
            <h3>Zum Startbildschirm hinzufügen</h3>
            <ol>
                <li>
                    In Safari unten auf <strong>Teilen</strong> tippen
                    <span className="install-prompt-overlay__icon" aria-hidden> ⬆️</span>
                </li>
                <li>
                    <strong>„Zum Home-Bildschirm“</strong> wählen
                    <span className="install-prompt-overlay__icon" aria-hidden> ➕</span>
                </li>
                <li>Mit <strong>„Hinzufügen“</strong> bestätigen</li>
            </ol>
            <button
                className="install-prompt-overlay__close"
                onClick={onClose}
            >
                Verstanden
            </button>
        </div>
    </div>
);
