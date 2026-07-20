// src/components/OnboardingOverlay.tsx
import {useLocation, useNavigate} from "react-router";
import {useLocalStore} from "../stores/useLocalStore";
import {useAppStore} from "../stores/useAppStore";
import {seedDemoData} from "../lib/demoData";
import {allEmptyStepsDone, currentProjectId} from "./tour/tourSteps";
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
    const {pathname} = useLocation();
    const [farm, setFarm] = useLocalStore((s) => s.dwa_farm);
    const [projects, setProjects] = useLocalStore((s) => s.dwa_projects);
    const precipitationLookup = useAppStore((s) => s.precipitationLookup);
    const et0Lookup = useAppStore((s) => s.et0Lookup);
    const hasFarm = farm.name.trim().length > 0 && farm.fields.length > 0;

    // Rundgang nur anbieten, wenn er noch etwas leitet: bei geladenen Beispieldaten
    // (Demo-Rundgang) oder solange der Anlege-Rundgang noch offene Schritte hat.
    // Bei vollständigen Eigendaten würde der Leerzustand-Rundgang nur auf die
    // Zusammenfassung springen – dann Button ausblenden, stattdessen FAQ nutzen.
    const tourCtx = {farm, projects, pathname};
    const showTour = hasDemo || !allEmptyStepsDone(tourCtx);
    const ownProjectId = currentProjectId(tourCtx);

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

                {showTour && (
                    <button
                        className="onboarding-overlay__tour-btn"
                        onClick={() => onStartTour(hasDemo ? "demo" : "empty")}
                    >
                        {hasDemo
                            ? "🧭 Rundgang durch die Beispieldaten"
                            : "🧭 Schritt für Schritt anlegen (geführt)"}
                    </button>
                )}

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

                <p className="onboarding-overlay__steps-heading">Häufige Fragen</p>

                <div className="onboarding-overlay__faq">
                    <details className="onboarding-overlay__faq-item">
                        <summary>Wo lege ich eine Fläche an oder bearbeite sie?</summary>
                        <p>
                            Öffnen Sie unten in der Navigation den Tab
                            <strong> 🏡 Betrieb</strong>. Dort legen Sie über
                            „+ Feld hinzufügen“ neue Flächen an; über das Stift-Symbol
                            ändern Sie Standort und Bodenklasse einer bestehenden Fläche.
                        </p>
                        <button className="onboarding-overlay__faq-link" onClick={() => goTo("/farm")}>
                            Zu den Flächen ➔
                        </button>
                    </details>

                    <details className="onboarding-overlay__faq-item">
                        <summary>Wie lege ich ein Szenario an?</summary>
                        <p>
                            Ein Szenario bündelt eine Berechnung (z. B. für ein bestimmtes
                            Jahr). Öffnen Sie unten in der Navigation den Tab
                            <strong> 🌾 Szenarien</strong> und legen Sie es dort über
                            „+ Neues Szenario“ an; anschließend weisen Sie ihm Ihre Flächen zu.
                        </p>
                        <button
                            className="onboarding-overlay__faq-link"
                            onClick={() => goTo("/")}
                            disabled={!hasFarm}
                            title={!hasFarm ? "Zuerst eine Fläche anlegen" : undefined}
                        >
                            Zu den Szenarien ➔
                        </button>
                    </details>

                    <details className="onboarding-overlay__faq-item">
                        <summary>Wie ändere ich eine Zuweisung?</summary>
                        <p>
                            Öffnen Sie unter <strong>🌾 Szenarien</strong> das Szenario und
                            darin die betreffende Zuweisung. Dort ändern Sie die Nutzung
                            (z. B. Hauptkulturen, Gemüse, Golf) und die Angaben; die App
                            berechnet den Wasserbedarf neu und speichert beim Bestätigen.
                        </p>
                        <button
                            className="onboarding-overlay__faq-link"
                            onClick={() => goTo(ownProjectId ? `/projects/${ownProjectId}` : "/")}
                        >
                            Zu den Szenarien ➔
                        </button>
                    </details>

                    <details className="onboarding-overlay__faq-item">
                        <summary>Wo sehe ich das Ergebnis und erzeuge das PDF?</summary>
                        <p>
                            Öffnen Sie unter <strong>🌾 Szenarien</strong> Ihr Szenario. In
                            der <strong>Zusammenfassung</strong> steht der Gesamtbedarf über
                            alle Flächen; von dort erzeugen Sie das PDF für Ihren Antrag.
                        </p>
                        <button
                            className="onboarding-overlay__faq-link"
                            onClick={() => goTo(ownProjectId ? `/projects/${ownProjectId}` : "/")}
                        >
                            Zur Zusammenfassung ➔
                        </button>
                    </details>
                </div>

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
