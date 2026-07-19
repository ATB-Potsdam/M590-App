// src/components/tour/TourOverlay.tsx
import {useEffect, useLayoutEffect, useRef} from "react";
import {useLocation, useNavigate} from "react-router";
import {
    arrow,
    autoUpdate,
    flip,
    offset,
    shift,
    useFloating,
} from "@floating-ui/react";
import {useAppStore} from "../../stores/useAppStore";
import {useLocalStore} from "../../stores/useLocalStore";
import {tourStepsFor} from "./tourSteps";
import type {TourContext} from "./tourSteps";
import {useTourTarget} from "./useTourTarget";
import "./TourOverlay.scss";

interface Props {
    /** ID des Demo-Szenarios – für die route-Funktionen der Schritte 3–5. */
    demoProjectId?: string;
}

/** Loch-Rand um das hervorgehobene Ziel. */
const SPOTLIGHT_PADDING = 8;

const resolveRoute = (route: string | ((id: string) => string), demoId: string): string =>
    typeof route === "function" ? route(demoId) : route;

export const TourOverlay = ({demoProjectId}: Props) => {
    const tourActive = useAppStore((s) => s.tourActive);
    const tourVariant = useAppStore((s) => s.tourVariant);
    const tourStep = useAppStore((s) => s.tourStep);
    const nextTourStep = useAppStore((s) => s.nextTourStep);
    const endTour = useAppStore((s) => s.endTour);
    const [, setTourCompleted] = useLocalStore((s) => s.dwa_tour_completed);
    const [farm] = useLocalStore((s) => s.dwa_farm);
    const [projects] = useLocalStore((s) => s.dwa_projects);
    const location = useLocation();
    const navigate = useNavigate();

    const steps = tourStepsFor(tourVariant);
    const step = tourActive ? steps[tourStep] : undefined;
    const isLast = tourStep === steps.length - 1;
    const rect = useTourTarget(step ? step.target : null);

    const arrowRef = useRef<HTMLDivElement>(null);
    const {refs, floatingStyles, middlewareData, placement, update} = useFloating({
        // "fixed": das virtuelle Referenz-Element liefert Viewport-Koordinaten
        // (getBoundingClientRect). Mit der Default-Strategie "absolute" würde
        // floating-ui offsetParent-relative rechnen → Tooltip säße falsch.
        strategy: "fixed",
        placement: step?.placement ?? "bottom",
        middleware: [offset(12), flip({padding: 8}), shift({padding: 8}), arrow({element: arrowRef})],
        whileElementsMounted: autoUpdate,
    });

    // Virtuelles Referenz-Element aus dem gemessenen Ziel-Rechteck.
    useLayoutEffect(() => {
        if (!rect) {
            refs.setReference(null);
            return;
        }
        refs.setReference({
            getBoundingClientRect: () => ({
                x: rect.left,
                y: rect.top,
                top: rect.top,
                left: rect.left,
                right: rect.left + rect.width,
                bottom: rect.top + rect.height,
                width: rect.width,
                height: rect.height,
            }),
        });
        update();
    }, [rect, refs, update]);

    const finish = () => {
        setTourCompleted(true);
        endTour();
    };

    // Escape beendet den Rundgang.
    useEffect(() => {
        if (!tourActive) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") finish();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tourActive]);

    // Bei Start/Wechsel eines Schritts mit fester Ziel-Route dorthin navigieren,
    // falls der Anwender gerade woanders ist (z. B. Rundgang aus dem ?-Dialog auf
    // der Szenario-Seite gestartet → zurück auf /farm). Funktions-Routen (mit
    // Projekt-ID) werden nur mitten im Rundgang erreicht und daher ausgelassen.
    useEffect(() => {
        if (!step || typeof step.route !== "string") return;
        if (location.pathname !== step.route) navigate(step.route);
    }, [step, location.pathname, navigate]);

    // Routen-basiertes Vorrücken: sobald der Pfad zum Ziel des NÄCHSTEN Schritts passt.
    useEffect(() => {
        if (!step || step.advanceOn !== "route") return;
        const next = steps[tourStep + 1];
        if (!next) return;
        const wanted = resolveRoute(next.route, demoProjectId ?? "");
        if (location.pathname === wanted) nextTourStep();
    }, [location.pathname, step, steps, tourStep, demoProjectId, nextTourStep]);

    // Zustands-basiertes Vorrücken: sobald die echte Aktion erfolgt ist
    // (Name gesetzt, Feld angelegt, Szenario erstellt, Nutzung zugewiesen).
    useEffect(() => {
        if (!step || step.advanceOn !== "state" || !step.done) return;
        const ctx: TourContext = {farm, projects, demoProjectId, pathname: location.pathname};
        if (step.done(ctx)) nextTourStep();
    }, [step, farm, projects, demoProjectId, location.pathname, nextTourStep]);

    if (!tourActive || !step || !rect) return null;

    const arrowX = middlewareData.arrow?.x;
    const arrowY = middlewareData.arrow?.y;
    // Seite, an der der Tooltip-Pfeil sitzt (dem Ziel zugewandt).
    const staticSide = ({top: "bottom", right: "left", bottom: "top", left: "right"} as const)[
        placement.split("-")[0] as "top" | "right" | "bottom" | "left"
    ];

    return (
        <div className="tour-overlay">
            {/* Dimmer mit „Loch“ um das Ziel (box-shadow). Klicks gehen durch. */}
            <div
                className="tour-overlay__spotlight"
                style={{
                    top: rect.top - SPOTLIGHT_PADDING,
                    left: rect.left - SPOTLIGHT_PADDING,
                    width: rect.width + SPOTLIGHT_PADDING * 2,
                    height: rect.height + SPOTLIGHT_PADDING * 2,
                }}
            />

            <div ref={refs.setFloating} className="tour-overlay__tooltip" style={floatingStyles}>
                <div
                    ref={arrowRef}
                    className="tour-overlay__arrow"
                    style={{
                        left: arrowX != null ? `${arrowX}px` : "",
                        top: arrowY != null ? `${arrowY}px` : "",
                        [staticSide]: "-6px",
                    }}
                />
                <div className="tour-overlay__step-count">Schritt {tourStep + 1} von {steps.length}</div>
                <h3 className="tour-overlay__title">{step.title}</h3>
                <p className="tour-overlay__body">{step.body}</p>
                <div className="tour-overlay__actions">
                    <button type="button" className="tour-overlay__skip" onClick={finish}>
                        Überspringen
                    </button>
                    {step.advanceOn === "button" && (
                        isLast ? (
                            <button type="button" className="tour-overlay__next" onClick={finish}>
                                Fertig
                            </button>
                        ) : (
                            <button type="button" className="tour-overlay__next" onClick={nextTourStep}>
                                Weiter ➔
                            </button>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};
