// src/components/tour/TourOverlay.tsx
import {Fragment, useEffect, useLayoutEffect, useMemo, useRef, type ReactNode} from "react";
import {useLocation, useNavigate} from "react-router";
import {LocateIcon} from "../LocateIcon";
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
import {currentEmptyStep, currentProjectId, tourStepsFor} from "./tourSteps";
import type {TourContext} from "./tourSteps";
import {useTourTarget} from "./useTourTarget";
import "./TourOverlay.scss";

interface Props {
    /** ID of the demo scenario – for the route functions of the demo walk-through. */
    demoProjectId?: string;
}

/** Cut-out padding around the highlighted target. */
const SPOTLIGHT_PADDING = 8;

/** Normalized view of the current step – regardless of which walk-through. */
interface ActiveStep {
    id: string;
    target: string;
    title: string;
    body: string;
    placement: Placement;
    route: string;                       // resolved target route
    /** Final step → "Fertig" instead of "Weiter". */
    terminal: boolean;
    /** This step advances via the "Weiter" button (demo linear step, or an empty
     *  "advance: button" sub-step). */
    demoButton: boolean;
    /** Empty-tour "Weiter" sub-step: its id to record in tourAdvanced on confirm. */
    advanceId?: string;
    /** Banner mode: no spotlight/target, fixed hint at the bottom edge. */
    banner: boolean;
}

const resolveRoute = (route: string | ((id: string) => string), demoId: string): string =>
    typeof route === "function" ? route(demoId) : route;

// Render a step body, replacing the `[locate]` token with the map's crosshair icon
// so the tour references the exact same glyph the locate button shows.
const renderBody = (body: string): ReactNode =>
    body.split("[locate]").map((part, i, arr) => (
        <Fragment key={i}>
            {part}
            {i < arr.length - 1 && <LocateIcon className="tour-inline-icon" />}
        </Fragment>
    ));

export const TourOverlay = ({demoProjectId}: Props) => {
    const tourActive = useAppStore((s) => s.tourActive);
    const tourVariant = useAppStore((s) => s.tourVariant);
    const tourStep = useAppStore((s) => s.tourStep);
    const nextTourStep = useAppStore((s) => s.nextTourStep);
    const prevTourStep = useAppStore((s) => s.prevTourStep);
    const tourAdvanced = useAppStore((s) => s.tourAdvanced);
    const advanceEmptyStep = useAppStore((s) => s.advanceEmptyStep);
    const unadvanceEmptyStep = useAppStore((s) => s.unadvanceEmptyStep);
    const suspendTour = useAppStore((s) => s.suspendTour);
    const endTour = useAppStore((s) => s.endTour);
    const [, setTourCompleted] = useLocalStore((s) => s.dwa_tour_completed);
    const [farm] = useLocalStore((s) => s.dwa_farm);
    const [projects] = useLocalStore((s) => s.dwa_projects);
    const location = useLocation();
    const navigate = useNavigate();

    const ctx: TourContext = useMemo(
        () => ({farm, projects, demoProjectId, pathname: location.pathname, advanced: tourAdvanced}),
        [farm, projects, demoProjectId, location.pathname, tourAdvanced],
    );

    // Project ID that the linear walk-through uses to resolve its routes. For the
    // demo walk-through this is the demo ID; for the "Kurzeinführung" on own data
    // it is the first (non-demo) scenario – currentProjectId provides both. Do NOT
    // hard-code demoProjectId, otherwise the routes point nowhere on own data.
    const tourPid = currentProjectId(ctx) ?? demoProjectId ?? "";

    // Determine the current step – state-driven (empty) or linear (demo).
    const active: ActiveStep | undefined = useMemo(() => {
        if (!tourActive) return undefined;
        if (tourVariant === "empty") {
            const s = currentEmptyStep(ctx);
            if (!s) return undefined;
            const isButton = s.advance === "button";
            return {
                id: s.id, target: s.target, title: s.title, body: s.body,
                placement: s.placement ?? "bottom", route: s.route(ctx),
                terminal: !!s.terminal, demoButton: isButton,
                advanceId: isButton ? s.id : undefined, banner: !!s.banner,
            };
        }
        const steps = tourStepsFor("demo");
        const s = steps[tourStep];
        if (!s) return undefined;
        return {
            id: s.id, target: s.target, title: s.title, body: s.body,
            placement: s.placement ?? "bottom", route: resolveRoute(s.route, tourPid),
            terminal: tourStep === steps.length - 1,
            demoButton: s.advanceOn === "button", banner: false,
        };
    }, [tourActive, tourVariant, ctx, tourStep, tourPid]);

    const rect = useTourTarget(active && !active.banner ? active.target : null);

    // Focus the highlighted step's input, so the user can type right after
    // "Weiter" without clicking into the field first. Only text inputs (not
    // radios/checkboxes), and only if focus isn't already inside the target.
    const activeTarget = active && !active.banner ? active.target : null;
    useEffect(() => {
        if (!activeTarget || !rect) return;
        const host = document.querySelector(`[data-tour="${activeTarget}"]`);
        if (!host) return;
        const input = host.querySelector<HTMLInputElement | HTMLTextAreaElement>(
            'input:not([type="radio"]):not([type="checkbox"]):not([disabled]), textarea',
        );
        if (input && !host.contains(document.activeElement)) input.focus();
    }, [activeTarget, rect]);

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

    // Fertig = completed (no resume button anymore).
    const finish = () => { setTourCompleted(true); endTour(); };
    // Skip/Escape = only pause; resumable via the floating button.
    const suspend = () => { suspendTour(); };

    // Escape pauses the walk-through.
    useEffect(() => {
        if (!tourActive) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") suspend(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tourActive]);

    // Navigate to the current step's target route when needed (e.g. walk-through
    // started from the ?-dialog on a different page). Skip the empty project route
    // (no project). IMPORTANT: for NON-final steps do not navigate when the user is
    // already DEEPER (sub-page of the target route) – otherwise the walk-through
    // yanks them straight back to the scenario page when they open an assignment
    // (endless loop, "Nutzung wählen" seems to have no effect). Exception: the
    // final step (summary) has NO target on a sub-page (assignment form) – if the
    // user starts the walk-through there with already complete data, the banner
    // would otherwise stay invisible. So for the final step, navigate up to the
    // target route even from a sub-page.
    useEffect(() => {
        if (!active || !active.route || active.route.endsWith("/projects/")) return;
        const here = location.pathname;
        if (here === active.route) return;
        // Do not yank back when the user has clicked FORWARD – i.e. is already on
        // the next step's route (or deeper); the advance effect will then move on
        // shortly. Only this forward route counts as "leave alone", NOT any
        // arbitrary deeper path: otherwise for route "/" even /farm would count as
        // a descendant and the step "Szenario öffnen" could never navigate to the
        // scenarios page. When clicking a scenario (/projects/x), that is exactly
        // the next step's route.
        if (!active.terminal && tourVariant === "demo") {
            const steps = tourStepsFor("demo");
            const next = steps[tourStep + 1];
            const nextRoute = next ? resolveRoute(next.route, tourPid) : "";
            if (nextRoute && nextRoute !== "/" && (here === nextRoute || here.startsWith(nextRoute + "/"))) return;
        }
        // Empty-state walk-through is state-driven (no fixed next step): if the
        // user is already DEEPER than the target route (e.g. opened the assignment
        // page /projects/:id/assignment/:aid from "Nutzung festlegen"
        // /projects/:id), do NOT yank back – the done predicate advances shortly.
        // Without this, clicking "Nutzung wählen" was immediately navigated back
        // (seemed to have no effect, walk-through hung).
        if (!active.terminal && tourVariant === "empty" && active.route !== "/" && here.startsWith(active.route + "/")) return;
        navigate(active.route);
    }, [active, location.pathname, navigate, tourVariant, tourStep, tourPid]);

    // Demo walk-through: route-based advancing (the user navigates themselves).
    useEffect(() => {
        if (!active || tourVariant !== "demo") return;
        const steps = tourStepsFor("demo");
        const cur = steps[tourStep];
        if (!cur || cur.advanceOn !== "route") return;
        // Special case "open-assignment": the next step (assignment-detail) lives
        // on the DEEPER assignment page, whose ID the walk-through does not know.
        // So detect via prefix that an assignment has been opened.
        if (cur.id === "open-assignment") {
            const projectRoute = `/projects/${tourPid}`;
            if (location.pathname.startsWith(`${projectRoute}/assignment/`)) nextTourStep();
            return;
        }
        const next = steps[tourStep + 1];
        if (!next) return;
        const wanted = resolveRoute(next.route, tourPid);
        if (location.pathname === wanted) nextTourStep();
    }, [active, tourVariant, location.pathname, tourStep, tourPid, nextTourStep]);

    // empty walk-through: done as soon as no step is open anymore.
    useEffect(() => {
        if (tourActive && tourVariant === "empty" && !active) finish();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tourActive, tourVariant, active]);

    // Banner mode covers the bottom edge of the page (incl. "Zuweisung speichern").
    // While the banner is visible, give the <body> room at the bottom so the page
    // can scroll past the banner and all controls (save button) stay reachable.
    const bannerActive = tourActive && !!active?.banner;
    useEffect(() => {
        document.body.classList.toggle("tour-banner-active", bannerActive);
        return () => document.body.classList.remove("tour-banner-active");
    }, [bannerActive]);

    if (!tourActive || !active) return null;
    if (!active.banner && !rect) return null;

    const onNext = () => {
        if (active.terminal) { finish(); return; }
        // Empty-tour "Weiter" sub-step → record it done; the next not-done step
        // (via currentEmptyStep) becomes active. Demo linear step → advance index.
        if (active.advanceId) { advanceEmptyStep(active.advanceId); return; }
        if (active.demoButton) { nextTourStep(); return; }
    };
    const showNextButton = active.terminal || active.demoButton;

    // Back is only offered where it can't lie: demo linear steps (index−1), and
    // empty "Weiter" sub-steps (pop the last confirmation → previous sub-step). It
    // is never shown on empty state-steps (a saved field/scenario can't be undone).
    const canBack = tourVariant === "demo"
        ? tourStep > 0
        : !!active.advanceId && tourAdvanced.length > 0;
    const onBack = () => {
        if (tourVariant === "demo") { prevTourStep(); return; }
        unadvanceEmptyStep();
    };

    const actions = (
        <div className={`tour-overlay__actions${active.terminal ? " tour-overlay__actions--end" : ""}`}>
            {canBack && (
                <button type="button" className="tour-overlay__back" onClick={onBack}>
                    ⬅ Zurück
                </button>
            )}
            {/* In the final step "Tour pausieren" makes no sense – only "Fertig". */}
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

    // Banner mode: no spotlight, fixed hint at the bottom – for self-scrolling
    // forms (assignment form) where a roaming spotlight would run off-screen.
    if (active.banner) {
        return (
            <div className="tour-overlay tour-overlay--banner">
                <div className="tour-overlay__tooltip tour-overlay__tooltip--banner">
                    <h3 className="tour-overlay__title">{active.title}</h3>
                    <p className="tour-overlay__body">{renderBody(active.body)}</p>
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

    if (!rect) return null; // (Non-banner: already ensured by the guards above.)

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
                    data-side={placement.split("-")[0]}
                    style={{
                        left: arrowX != null ? `${arrowX}px` : "",
                        top: arrowY != null ? `${arrowY}px` : "",
                        [staticSide]: "-6px",
                    }}
                />
                <h3 className="tour-overlay__title">{active.title}</h3>
                <p className="tour-overlay__body">{renderBody(active.body)}</p>
                {actions}
            </div>
        </div>
    );
};
