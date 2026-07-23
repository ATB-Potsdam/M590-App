// src/components/OnboardingOverlay.tsx
import {useLocation} from "react-router";
import {useLocalStore} from "../stores/useLocalStore";
import {useAppStore} from "../stores/useAppStore";
import {seedDemoData} from "../lib/demoData";
import {allEmptyStepsDone, currentProjectId, isTourWalkable} from "./tour/tourSteps";
import "./OnboardingOverlay.scss";

interface Props {
    onClose: () => void;
    /**
     * Close the overlay AND navigate – without the history.back() pop of the
     * normal close. Otherwise the history entry pushed on open would immediately
     * undo the target navigation of the FAQ links (you end up back on the
     * original page).
     */
    onNavigate: (path: string) => void;
    /** Start the guided walk-through. "demo" tours example data, "empty" guides through setup. */
    onStartTour: (variant: "demo" | "empty") => void;
    /** Whether a demo scenario already exists (then a walk-through through the example data). */
    hasDemo: boolean;
}

export const OnboardingOverlay = ({onClose, onNavigate, onStartTour, hasDemo}: Props) => {
    const {pathname} = useLocation();
    const [farm, setFarm] = useLocalStore((s) => s.dwa_farm);
    const [projects, setProjects] = useLocalStore((s) => s.dwa_projects);
    const [, setTourCompleted] = useLocalStore((s) => s.dwa_tour_completed);
    const precipitationLookup = useAppStore((s) => s.precipitationLookup);
    const et0Lookup = useAppStore((s) => s.et0Lookup);
    const hasFarm = farm.name.trim().length > 0 && farm.fields.length > 0;

    // Walk-through offer – three cases, in this order:
    //  1. Example data loaded  → demo walk-through ("… through the example data").
    //  2. Own data incomplete → guided setup (empty-state walk-through).
    //  3. Own data complete & walkable → neutral "Kurzeinführung" (short intro)
    //     (the same linear walk-through as the demo, leading to the most important
    //     places – to refresh after a longer break).
    // If, with complete data, the walk-through is not walkable (no clickable
    // Zuweisung), no button is shown – then the FAQ takes over.
    const tourCtx = {farm, projects, pathname};
    const setupIncomplete = !allEmptyStepsDone(tourCtx);
    const tourMode: "demo" | "empty" | "orientation" | null =
        hasDemo ? "demo"
            : setupIncomplete ? "empty"
                : isTourWalkable(tourCtx) ? "orientation"
                    : null;
    const ownProjectId = currentProjectId(tourCtx);

    // Orientation walk-through uses the same (linear) flow as the demo walk-through.
    const tourVariant = tourMode === "empty" ? "empty" : "demo";
    // Label: guided setup on empty data ("Erste Schritte"), otherwise a walk-through
    // through existing data (demo or own complete data) → "Kurze Tour".
    const tourLabel = tourMode === "empty" ? "Los geht's ➔" : "Kurze Tour ➔";

    // Close+navigate via onNavigate (without history.back()), otherwise the
    // FAQ navigation would be immediately undone.
    const goTo = (path: string) => onNavigate(path);

    // Demo path: seed the example data and close. The floating TourStartButton /
    // DemoHint then offer the walk-through through the freshly loaded example.
    const loadDemo = () => {
        seedDemoData(setFarm, setProjects, precipitationLookup, et0Lookup);
        // Offer the walk-through again (floating button), in case it was ended earlier.
        setTourCompleted(false);
        onClose();
    };

    return (
        <div className="onboarding-overlay" onClick={onClose}>
            <div className="onboarding-overlay__dialog" onClick={(e) => e.stopPropagation()}>
                <h2 className="onboarding-overlay__title">Hilfe &amp; Erste Schritte</h2>

                {(tourMode || !hasFarm) && (
                    <div className="onboarding-overlay__start">
                        {!hasFarm ? (
                            <>
                                <p className="onboarding-overlay__start-lead">
                                    Lernen Sie die App an einem fertigen Beispiel kennen
                                    (Kartoffel-Acker + Golfplatz):
                                </p>
                                <button className="onboarding-overlay__start-btn" onClick={loadDemo}>
                                    Rundgang mit Beispieldaten ➔
                                </button>

                                <p className="onboarding-overlay__start-lead">
                                    Oder gleich mit eigenen Daten beginnen?
                                </p>
                                <button
                                    className="onboarding-overlay__start-btn"
                                    onClick={() => onStartTour("empty")}
                                >
                                    Los geht's ➔
                                </button>
                            </>
                        ) : (
                            tourMode && (
                                <button
                                    className="onboarding-overlay__start-btn"
                                    onClick={() => onStartTour(tourVariant)}
                                >
                                    {tourLabel}
                                </button>
                            )
                        )}
                    </div>
                )}

                <p className="onboarding-overlay__steps-heading">Häufige Fragen</p>

                <div className="onboarding-overlay__faq">
                    <details className="onboarding-overlay__faq-item" name="faq">
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

                    <details className="onboarding-overlay__faq-item" name="faq">
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

                    <details className="onboarding-overlay__faq-item" name="faq">
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

                    <details className="onboarding-overlay__faq-item" name="faq">
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
                    Schließen
                </button>
            </div>
        </div>
    );
};
