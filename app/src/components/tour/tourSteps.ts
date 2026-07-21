// src/components/tour/tourSteps.ts
import type {Placement} from "@floating-ui/react";
import type {Farm} from "../../types/farm";
import type {Project} from "../../types/project";

/** Context against which state-based steps check their completion. */
export interface TourContext {
    farm: Farm;
    projects: Project[];
    demoProjectId?: string;
    pathname: string;
}

/**
 * ID of the scenario that the (linear) walk-through opens: the first one created
 * by the user (non-demo), otherwise the first one at all. The spotlight anchor
 * `data-tour="project-row"` MUST be set on exactly this row, otherwise the step
 * "Szenario öffnen" finds no target and the walk-through hangs.
 */
export const tourProjectId = (projects: Project[]): string | undefined =>
    projects.find((p) => !p.isDemo)?.id ?? projects[0]?.id;

/** ID of the user-created (non-demo) scenario – for target routes. */
export const currentProjectId = (ctx: TourContext): string | undefined =>
    tourProjectId(ctx.projects);

/**
 * A step of the guided walk-through. The user performs the actual action
 * themselves; the walk-through "listens" (route or state) and then advances.
 */
export interface TourStep {
    id: string;
    /** Expected path for this step. Function if the demo ID is needed. */
    route: string | ((demoId: string) => string);
    /** data-tour value of the element that is highlighted. */
    target: string;
    title: string;
    /** Why-click-here text (German). */
    body: string;
    placement?: Placement;
    /**
     * How the step is completed:
     *  - "route":  path matches the next step's target (user navigates)
     *  - "state":  a state has changed (name set, field created, …)
     *  - "button": the user confirms via "Weiter"/"Fertig"
     */
    advanceOn: "route" | "state" | "button";
    /** Only for advanceOn === "state": true once the step is done. */
    done?: (ctx: TourContext) => boolean;
}

const hasFarmName = (ctx: TourContext) => ctx.farm.name.trim().length > 0;
const hasField = (ctx: TourContext) => ctx.farm.fields.length > 0;
const hasProject = (ctx: TourContext) => ctx.projects.some((p) => !p.isDemo);
const onProjectDetail = (ctx: TourContext) => /^\/projects\/[^/]+$/.test(ctx.pathname);
const onAssignmentPage = (ctx: TourContext) => /^\/projects\/[^/]+\/assignment\//.test(ctx.pathname);
const hasAssignment = (ctx: TourContext) =>
    ctx.projects.some((p) => p.fieldAssignments.length > 0);
const hasAssignedModule = (ctx: TourContext) =>
    ctx.projects.some((p) => p.fieldAssignments.some((fa) => !!fa.module));

// Step shared by both walk-throughs: create/edit fields.
const fieldStep = (advanceOn: "state" | "button"): TourStep => ({
    id: "add-field",
    route: "/farm",
    target: "add-field",
    title: "Flächen anlegen",
    body: advanceOn === "state"
        ? "Legen Sie hier Ihre erste Fläche an – mit Standort (Karte) und Bodenklasse. Daraus ermittelt die App Klimadaten und Wasserbedarf."
        : "Über „+ Feld hinzufügen“ legen Sie Flächen an; über das Stift-Symbol an einer Fläche bearbeiten Sie Standort und Bodenklasse nachträglich.",
    placement: "top",
    advanceOn,
    ...(advanceOn === "state" ? {done: hasField} : {}),
});

/**
 * Walk-through of the loaded demo data (variant b): leads through the context of
 * fields → scenarios → assignment → summary, without pulling into forms.
 */
export const demoSteps: TourStep[] = [
    {
        id: "farm-fields",
        route: "/farm",
        target: "farm-fields",
        title: "Ihre Flächen",
        body: "Das sind Ihre Felder bzw. Flächen mit Standort und Bodenklasse. Aus diesen Angaben berechnet die App den Wasserbedarf.",
        placement: "bottom",
        advanceOn: "button",
    },
    fieldStep("button"),
    {
        id: "nav-scenarios",
        route: "/farm",
        target: "nav-scenarios",
        title: "Weiter zu den Szenarien",
        body: "Tippen Sie unten auf Szenarien ➔ – dort stecken die Berechnungen für Ihre Flächen.",
        placement: "top",
        advanceOn: "route",
    },
    {
        id: "open-project",
        route: "/",
        target: "project-row",
        title: "Szenario öffnen",
        body: "Öffnen Sie ein Szenario ➔, um die zugewiesenen Flächen und ihre Ergebnisse zu sehen.",
        placement: "bottom",
        advanceOn: "route",
    },
    {
        id: "open-assignment",
        route: (id) => `/projects/${id}`,
        target: "assignment-row",
        title: "Zuweisungen",
        body: "Jede Zeile ist eine Zuweisung: eine Fläche mit ihrer Nutzung und dem berechneten Bedarf. Öffnen Sie die Zuweisung mit einem Klick, um die Details zu sehen.",
        placement: "bottom",
        // User clicks the assignment → switching to the assignment page advances.
        advanceOn: "route",
    },
    {
        id: "assignment-detail",
        // Parent route (scenario page): the auto-navigation leaves the user alone
        // on the deeper assignment page (here.startsWith(route + "/")), so that the
        // spotlight can hit the result on the assignment page.
        route: (id) => `/projects/${id}`,
        target: "assignment-result",
        title: "Berechnung & Ergebnis",
        body: "Hier legen Sie Nutzung und Angaben fest; die App berechnet den Wasserbedarf (Normal- und Trockenjahr) samt Zuschlägen. Mit „Weiter“ geht es zurück zur Übersicht.",
        placement: "top",
        advanceOn: "button",
    },
    {
        id: "summary",
        route: (id) => `/projects/${id}`,
        target: "project-summary",
        title: "Zusammenfassung & PDF",
        body: "Hier steht der Gesamtbedarf über alle Flächen – und Sie können daraus das PDF für Ihren Antrag erzeugen.",
        placement: "top",
        advanceOn: "button",
    },
];

/**
 * Walk-through for the empty state: guides step by step through creating your
 * own data. Each step advances automatically once the actual action has been
 * done (name set, field created, scenario created, usage assigned).
 */
/**
 * State-driven step of the empty-state walk-through. Unlike the demo walk-through,
 * this one does not run via a fixed index; instead the active step is always the
 * first one NOT yet done – derived from the actual app state. So the walk-through
 * (even after a restart from the ?-dialog) always shows the next sensible step,
 * regardless of what already exists.
 */
export interface EmptyStep {
    id: string;
    /** Target route; function if the project ID is needed. */
    route: (ctx: TourContext) => string;
    /** data-tour value of the element to highlight. */
    target: string;
    title: string;
    body: string;
    placement?: Placement;
    /** true once the step is considered done based on the state. */
    done: (ctx: TourContext) => boolean;
    /** Last step: "Fertig" instead of "Weiter". */
    terminal?: boolean;
    /**
     * Banner mode: no spotlight/no target, but a hint anchored fixed at the bottom
     * edge. For steps whose "target" is a multi-part, self-scrolling form
     * (assignment form) – a roaming spotlight would constantly scroll off-screen
     * there.
     */
    banner?: boolean;
}

const FARM = (): string => "/farm";
const SCEN = (): string => "/";
const PROJ = (ctx: TourContext): string => `/projects/${currentProjectId(ctx) ?? ""}`;

export const emptySteps: EmptyStep[] = [
    {
        id: "farm-name", route: FARM, target: "farm-name",
        title: "Betrieb benennen",
        body: "Geben Sie zuerst den Namen Ihres Betriebs ein und bestätigen Sie mit Enter oder dem Haken.",
        placement: "bottom",
        done: hasFarmName,
    },
    {
        id: "add-field", route: FARM, target: "add-field",
        title: "Flächen anlegen",
        body: "Legen Sie hier Ihre erste Fläche an – mit Standort (Karte) und Bodenklasse. Sie können mehrere Flächen anlegen. Daraus ermittelt die App Klimadaten und Wasserbedarf.",
        placement: "top",
        done: hasField,
    },
    {
        id: "nav-scenarios", route: FARM, target: "nav-scenarios",
        title: "Zu den Szenarien",
        body: "Wechseln Sie unten zu Szenarien ➔ – dort legen Sie eine Bewässerungsberechnung an.",
        placement: "top",
        // Done once the user reaches the scenarios page (or beyond).
        done: (ctx) => ctx.pathname === "/" || onProjectDetail(ctx) || onAssignmentPage(ctx) || hasProject(ctx),
    },
    {
        id: "add-scenario", route: SCEN, target: "add-scenario",
        title: "Szenario anlegen",
        body: "Legen Sie mit „+ Neues Szenario“ Ihre erste Berechnung an (z. B. für ein bestimmtes Jahr).",
        placement: "top",
        done: hasProject,
    },
    {
        id: "assign-field", route: PROJ, target: "add-assignment",
        title: "Fläche zuweisen",
        body: "Fügen Sie dem Szenario eine Ihrer Flächen hinzu. Sie können später mehrere Flächen zuweisen.",
        placement: "top",
        done: hasAssignment,
    },
    {
        id: "open-usage", route: PROJ, target: "assignment-row",
        title: "Nutzung festlegen",
        body: "Öffnen Sie die Zuweisung („Nutzung wählen“), um die Art der Nutzung festzulegen.",
        placement: "bottom",
        // Done once the assignment page is open OR a module is already set.
        done: (ctx) => onAssignmentPage(ctx) || hasAssignedModule(ctx),
    },
    {
        id: "configure-assignment", route: PROJ, target: "assignment-steps",
        title: "Nutzung wählen & speichern",
        body: "Arbeiten Sie die Schritte Nutzung ➔ Details ab: Nutzung wählen (z. B. Hauptkulturen oder Golf), Angaben ausfüllen und die Zuweisung speichern. Die App berechnet den Bedarf automatisch – danach geht die Tour weiter.",
        banner: true,
        // Module only lands in the store on save → fires after saving.
        done: hasAssignedModule,
    },
    {
        id: "summary", route: PROJ, target: "project-summary",
        title: "Zusammenfassung & PDF",
        body: "Hier steht der Gesamtbedarf – und Sie können daraus das PDF für Ihren Antrag erzeugen. Fertig!",
        placement: "top",
        terminal: true,
        done: () => false, // Final step: stays until "Fertig".
    },
];

/**
 * Current step of the empty-state walk-through = first one not yet done, derived
 * purely from the app state. So the walk-through – even after a restart from the
 * ?-dialog – always shows the next sensible action. If everything except the
 * final step is done, that one is shown (until "Fertig").
 */
export const currentEmptyStep = (ctx: TourContext): EmptyStep | undefined => {
    for (const step of emptySteps) {
        if (step.terminal) return step;
        if (!step.done(ctx)) return step;
    }
    return undefined;
};

/**
 * True once all content empty-state steps (excluding the final step) are done –
 * i.e. there is already a farm, field, scenario, assignment and module. Then the
 * guided setup walk-through is moot and would only jump to the summary; the
 * ?-dialog hides the walk-through button in that case.
 */
export const allEmptyStepsDone = (ctx: TourContext): boolean =>
    emptySteps.every((step) => step.terminal || step.done(ctx));

/**
 * True if the (linear) walk-through can run through completely with the existing
 * data – i.e. there is a farm, a field, and the scenario opened by the
 * walk-through (currentProjectId) has at least one assignment whose field exists.
 * Only then do the click-/route-based steps work (open scenario → open
 * assignment). This lets the walk-through be offered as a neutral
 * "Kurzeinführung" even without demo data – but only if it would not get stuck
 * halfway for lack of a clickable row.
 */
export const isTourWalkable = (ctx: TourContext): boolean => {
    if (!hasFarmName(ctx) || !hasField(ctx)) return false;
    const pid = currentProjectId(ctx);
    const project = ctx.projects.find((p) => p.id === pid);
    if (!project) return false;
    return project.fieldAssignments.some((fa) => ctx.farm.fields.some((f) => f.id === fa.fieldId));
};

export const tourStepsFor = (variant: "demo" | "empty"): TourStep[] =>
    variant === "empty" ? [] : demoSteps;
