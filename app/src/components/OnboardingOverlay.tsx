// src/components/OnboardingOverlay.tsx
import {useNavigate} from "react-router";
import {useLocalStore} from "../stores/useLocalStore";
import {useAppStore} from "../stores/useAppStore";
import {seedDemoData} from "../lib/demoData";
import "./OnboardingOverlay.scss";

const base = import.meta.env.BASE_URL;

interface Props {
    onClose: () => void;
    /** Geführten Rundgang starten. "demo" tourt Beispieldaten, "empty" leitet beim Anlegen an. */
    onStartTour: (variant: "demo" | "empty") => void;
    /** Ob bereits ein Demo-Szenario existiert (dann Rundgang durch die Beispieldaten). */
    hasDemo: boolean;
}

export const OnboardingOverlay = ({onClose, onStartTour, hasDemo}: Props) => {
    const navigate = useNavigate();
    const [farm, setFarm] = useLocalStore((s) => s.dwa_farm);
    const [, setProjects] = useLocalStore((s) => s.dwa_projects);
    const precipitationLookup = useAppStore((s) => s.precipitationLookup);
    const et0Lookup = useAppStore((s) => s.et0Lookup);
    const hasFarm = farm.name.trim().length > 0 && farm.fields.length > 0;

    const goTo = (path: string) => {
        onClose();
        navigate(path);
    };

    const loadDemo = () => {
        seedDemoData(setFarm, setProjects, precipitationLookup, et0Lookup);
        // Overlay schliessen und auf der Betriebsseite bleiben – das Overlay wird
        // ohne Betrieb ohnehin über /farm angezeigt. Dort erscheint der Demo-Hinweis
        // mit „Weiter zum Szenario“. Der Anwender sieht zuerst seinen Betrieb.
        onClose();
    };

    return (
        <div className="onboarding-overlay" onClick={onClose}>
            <div className="onboarding-overlay__dialog" onClick={(e) => e.stopPropagation()}>
                <h2 className="onboarding-overlay__title">Willkommen zur DWA-M 590 App</h2>
                <p className="onboarding-overlay__intro">
                    Diese App unterstützt Sie bei der Berechnung des Bewässerungsbedarfs
                    landwirtschaftlicher Flächen nach dem DWA-Merkblatt M 590.
                </p>

                <button
                    className="onboarding-overlay__tour-btn"
                    onClick={() => onStartTour(hasDemo ? "demo" : "empty")}
                >
                    {hasDemo
                        ? "🧭 Rundgang durch die Beispieldaten"
                        : "🧭 Schritt für Schritt anlegen (geführt)"}
                </button>

                {!hasFarm && (
                    <div className="onboarding-overlay__demo">
                        <p className="onboarding-overlay__demo-text">
                            Lieber erst ausprobieren? Laden Sie ein Beispiel mit fertigen
                            Ergebnissen (Kartoffel-Acker + Golfplatz) – jederzeit löschbar.
                        </p>
                        <button className="onboarding-overlay__demo-btn" onClick={loadDemo}>
                            Beispiel laden ➔
                        </button>
                    </div>
                )}

                <p className="onboarding-overlay__steps-heading">In drei Schritten zum Ergebnis:</p>

                <ol className="onboarding-overlay__steps">
                    <li>
                        <span className="onboarding-overlay__step-num">1</span>
                        <div className="onboarding-overlay__step-body">
                            <strong>Betrieb einrichten</strong>
                            <p>Geben Sie Ihren Betriebsnamen ein und legen Sie Ihre Schläge mit Standort und Bodenklasse an.</p>
                            <button className="onboarding-overlay__step-btn" onClick={() => goTo("/farm")}>
                                Jetzt einrichten ➔
                            </button>
                        </div>
                    </li>
                    <li>
                        <span className="onboarding-overlay__step-num">2</span>
                        <div className="onboarding-overlay__step-body">
                            <strong>Szenario anlegen</strong>
                            <p>Erstellen Sie ein Bewässerungsszenario (z. B. für ein bestimmtes Jahr) und wählen Sie die zu berechnenden Schläge aus.</p>
                            <button
                                className="onboarding-overlay__step-btn"
                                onClick={() => goTo("/")}
                                disabled={!hasFarm}
                                title={!hasFarm ? "Zuerst Betrieb einrichten" : undefined}
                            >
                                Jetzt anlegen ➔
                            </button>
                        </div>
                    </li>
                    <li>
                        <span className="onboarding-overlay__step-num">3</span>
                        <div className="onboarding-overlay__step-body">
                            <strong>Nutzung zuweisen</strong>
                            <p>Weisen Sie jedem Schlag ein Nutzungsmodul zu (z. B. Hauptkulturen, Gemüse, Golf). Die App berechnet den Wasserbedarf automatisch.</p>
                        </div>
                    </li>
                </ol>

                <button className="onboarding-overlay__dismiss" onClick={onClose}>
                    Verstanden
                </button>

                <div className="onboarding-overlay__logos">
                    <a href="https://www.atb-potsdam.de" target="_blank" rel="noopener noreferrer">
                        <img src={`${base}atb_logo.svg`} alt="ATB Leibniz-Institut für Agrartechnik und Bioökonomie" className="onboarding-overlay__logo" />
                    </a>
                    <a href="https://www.dwa.de" target="_blank" rel="noopener noreferrer">
                        <img src={`${base}dwa-logo.svg`} alt="DWA Deutsche Vereinigung für Wasserwirtschaft" className="onboarding-overlay__logo" />
                    </a>
                </div>
            </div>
        </div>
    );
};
