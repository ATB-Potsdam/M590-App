// src/components/tour/TourOverlay.tsx
import {useEffect, useLayoutEffect, useMemo, useRef} from "react";
import {useLocation, useNavigate} from "react-router";
import type {Placement} from "@floating-ui/react";
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
import {currentEmptyStep, tourStepsFor} from "./tourSteps";
import type {TourContext} from "./tourSteps";
import {useTourTarget} from "./useTourTarget";
import "./TourOverlay.scss";

interface Props {
    /** ID des Demo-Szenarios – für die route-Funktionen des Demo-Rundgangs. */
    demoProjectId?: string;
}

/** Loch-Rand um das hervorgehobene Ziel. */
const SPOTLIGHT_PADDING = 8;

/** Normalisierte Sicht auf den aktuellen Schritt – egal welcher Rundgang. */
interface ActiveStep {
    id: string;
    target: string;
    title: string;
    body: string;
    placement: Placement;
    route: string;                       // aufgelöste Ziel-Route
    /** Endschritt → „Fertig“ statt „Weiter“. */
    terminal: boolean;
    /** Demo-Rundgang: dieser Schritt rückt per „Weiter“-Button vor. */
    demoButton: boolean;
    /** Banner-Modus: kein Spotlight/Ziel, fester Hinweis am unteren Rand. */
    banner: boolean;
}

const resolveRoute = (route: string | ((id: string) => string), demoId: string): string =>
    typeof route === "function" ? route(demoId) : route;

export const TourOverlay = ({demoProjectId}: Props) => {
    const tourActive = useAppStore((s) => s.tourActive);
    const tourVariant = useAppStore((s) => s.tourVariant);
    const tourStep = useAppStore((s) => s.tourStep);
    const nextTourStep = useAppStore((s) => s.nextTourStep);
    const suspendTour = useAppStore((s) => s.suspendTour);
    const endTour = useAppStore((s) => s.endTour);
    const [, setTourCompleted] = useLocalStore((s) => s.dwa_tour_completed);
    const [farm] = useLocalStore((s) => s.dwa_farm);
    const [projects] = useLocalStore((s) => s.dwa_projects);
    const location = useLocation();
    const navigate = useNavigate();

    const ctx: TourContext = useMemo(
        () => ({farm, projects, demoProjectId, pathname: location.pathname}),
        [farm, projects, demoProjectId, location.pathname],
    );

    // Aktuellen Schritt bestimmen – zustandsgesteuert (empty) bzw. linear (demo).
    const active: ActiveStep | undefined = useMemo(() => {
        if (!tourActive) return undefined;
        if (tourVariant === "empty") {
            const s = currentEmptyStep(ctx);
            if (!s) return undefined;
            return {
                id: s.id, target: s.target, title: s.title, body: s.body,
                placement: s.placement ?? "bottom", route: s.route(ctx),
                terminal: !!s.terminal, demoButton: false, banner: !!s.banner,
            };
        }
        const steps = tourStepsFor("demo");
        const s = steps[tourStep];
        if (!s) return undefined;
        return {
            id: s.id, target: s.target, title: s.title, body: s.body,
            placement: s.placement ?? "bottom", route: resolveRoute(s.route, demoProjectId ?? ""),
            terminal: tourStep === steps.length - 1,
            demoButton: s.advanceOn === "button", banner: false,
        };
    }, [tourActive, tourVariant, ctx, tourStep, demoProjectId]);

    const rect = useTourTarget(active && !active.banner ? active.target : null);

    const arrowRef = useRef<HTMLDivElement>(null);
    const {refs, floatingStyles, middlewareData, placement, update} = useFloating({
        strategy: "fixed",
        placement: active?.placement ?? "bottom",
        middleware: [offset(12), flip({padding: 8}), shift({padding: 8}), arrow({element: arrowRef})],
        whileElementsMounted: autoUpdate,
    });

    useLayoutEffect(() => {
        if (!rect) { refs.setReference(null); return; }
        refs.setReference({
            getBoundingClientRect: () => ({
                x: rect.left, y: rect.top,
                top: rect.top, left: rect.left,
                right: rect.left + rect.width, bottom: rect.top + rect.height,
                width: rect.width, height: rect.height,
            }),
        });
        update();
    }, [rect, refs, update]);

    // Fertig = abgeschlossen (kein Fortsetzen-Button mehr).
    const finish = () => { setTourCompleted(true); endTour(); };
    // Überspringen/Escape = nur pausieren; über den Floating-Button fortsetzbar.
    const suspend = () => { suspendTour(); };

    // Escape pausiert den Rundgang.
    useEffect(() => {
        if (!tourActive) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") suspend(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tourActive]);

    // Bei Bedarf zur Ziel-Route des aktuellen Schritts navigieren (z. B. Rundgang
    // aus dem ?-Dialog auf einer anderen Seite gestartet). Leere Projekt-Route
    // (kein Projekt) auslassen. WICHTIG: bei NICHT-Endschritten nicht navigieren,
    // wenn der Anwender bereits TIEFER ist (Unterseite der Ziel-Route) – sonst
    // zieht der Rundgang ihn beim Öffnen einer Zuweisung sofort zur Szenario-Seite
    // zurück (Endlosschleife, „Nutzung wählen“ scheint wirkungslos). Ausnahme:
    // der Endschritt (Zusammenfassung) hat auf einer Unterseite (Zuweisungs-Maske)
    // KEIN Ziel – startet der Anwender den Rundgang dort mit bereits vollständigen
    // Daten, bliebe der Banner sonst unsichtbar. Darum für den Endschritt auch aus
    // einer Unterseite heraus zur Ziel-Route hochnavigieren.
    useEffect(() => {
        if (!active || !active.route || active.route.endsWith("/projects/")) return;
        const here = location.pathname;
        if (here === active.route) return;
        if (!active.terminal && here.startsWith(active.route + "/")) return; // bereits tiefer → in Ruhe lassen
        navigate(active.route);
    }, [active, location.pathname, navigate]);

    // Demo-Rundgang: routenbasiertes Vorrücken (Anwender navigiert selbst).
    useEffect(() => {
        if (!active || tourVariant !== "demo") return;
        const steps = tourStepsFor("demo");
        const cur = steps[tourStep];
        if (!cur || cur.advanceOn !== "route") return;
        // Sonderfall „open-assignment“: der nächste Schritt (assignment-detail)
        // liegt auf der TIEFEREN Zuweisungs-Seite, deren ID der Rundgang nicht
        // kennt. Darum per Präfix erkennen, dass eine Zuweisung geöffnet wurde.
        if (cur.id === "open-assignment") {
            const projectRoute = `/projects/${demoProjectId ?? ""}`;
            if (location.pathname.startsWith(`${projectRoute}/assignment/`)) nextTourStep();
            return;
        }
        const next = steps[tourStep + 1];
        if (!next) return;
        const wanted = resolveRoute(next.route, demoProjectId ?? "");
        if (location.pathname === wanted) nextTourStep();
    }, [active, tourVariant, location.pathname, tourStep, demoProjectId, nextTourStep]);

    // empty-Rundgang: fertig, sobald kein Schritt mehr offen ist.
    useEffect(() => {
        if (tourActive && tourVariant === "empty" && !active) finish();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tourActive, tourVariant, active]);

    // Banner-Modus verdeckt den unteren Seitenrand (u. a. „Zuweisung speichern“).
    // Solange der Banner sichtbar ist, dem <body> Platz nach unten geben, damit
    // die Seite über den Banner hinaus scrollen kann und alle Steuerelemente
    // (Speichern-Button) erreichbar bleiben.
    const bannerActive = tourActive && !!active?.banner;
    useEffect(() => {
        document.body.classList.toggle("tour-banner-active", bannerActive);
        return () => document.body.classList.remove("tour-banner-active");
    }, [bannerActive]);

    if (!tourActive || !active) return null;
    if (!active.banner && !rect) return null;

    const onNext = () => {
        if (active.terminal) { finish(); return; }
        if (active.demoButton) { nextTourStep(); return; }
    };
    const showNextButton = active.terminal || active.demoButton;

    const actions = (
        <div className={`tour-overlay__actions${active.terminal ? " tour-overlay__actions--end" : ""}`}>
            {/* Im Endschritt ergibt „Tour pausieren“ keinen Sinn – nur „Fertig“. */}
            {!active.terminal && (
                <button type="button" className="tour-overlay__skip" onClick={suspend}>
                    Tour pausieren
                </button>
            )}
            {showNextButton && (
                <button type="button" className="tour-overlay__next" onClick={onNext}>
                    {active.terminal ? "Fertig" : "Weiter ➔"}
                </button>
            )}
        </div>
    );

    // Banner-Modus: kein Spotlight, fester Hinweis unten – für selbst scrollende
    // Formulare (Zuweisungs-Maske), wo ein wanderndes Spotlight aus dem Bild liefe.
    if (active.banner) {
        return (
            <div className="tour-overlay tour-overlay--banner">
                <div className="tour-overlay__tooltip tour-overlay__tooltip--banner">
                    <h3 className="tour-overlay__title">{active.title}</h3>
                    <p className="tour-overlay__body">{active.body}</p>
                    {actions}
                </div>
            </div>
        );
    }

    const arrowX = middlewareData.arrow?.x;
    const arrowY = middlewareData.arrow?.y;
    const staticSide = ({top: "bottom", right: "left", bottom: "top", left: "right"} as const)[
        placement.split("-")[0] as "top" | "right" | "bottom" | "left"
    ];

    if (!rect) return null; // (Nicht-Banner: durch die Guards oben bereits gesetzt.)

    return (
        <div className="tour-overlay">
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
                <h3 className="tour-overlay__title">{active.title}</h3>
                <p className="tour-overlay__body">{active.body}</p>
                {actions}
            </div>
        </div>
    );
};
