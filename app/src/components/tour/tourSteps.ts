// src/components/tour/tourSteps.ts
import type {Placement} from "@floating-ui/react";
import type {Farm} from "../../types/farm";
import type {Project} from "../../types/project";

/** Kontext, gegen den state-basierte Schritte ihren Abschluss prüfen. */
export interface TourContext {
    farm: Farm;
    projects: Project[];
    demoProjectId?: string;
    pathname: string;
}

/** ID des vom Anwender angelegten (nicht-Demo) Szenarios – für Ziel-Routen. */
export const currentProjectId = (ctx: TourContext): string | undefined =>
    ctx.projects.find((p) => !p.isDemo)?.id ?? ctx.projects[0]?.id;

/**
 * Ein Schritt des geführten Rundgangs. Der Anwender führt die echte Aktion selbst
 * aus; der Rundgang „lauscht“ (Route bzw. Zustand) und rückt dann vor.
 */
export interface TourStep {
    id: string;
    /** Erwarteter Pfad für diesen Schritt. Funktion, falls die Demo-ID gebraucht wird. */
    route: string | ((demoId: string) => string);
    /** data-tour-Wert des Elements, das hervorgehoben wird. */
    target: string;
    title: string;
    /** Warum-hier-klicken-Text (Deutsch). */
    body: string;
    placement?: Placement;
    /**
     * Wie der Schritt abgeschlossen wird:
     *  - "route":  Pfad passt zum Ziel des nächsten Schritts (Anwender navigiert)
     *  - "state":  ein Zustand hat sich geändert (Name gesetzt, Feld angelegt, …)
     *  - "button": der Anwender bestätigt per „Weiter“/„Fertig“
     */
    advanceOn: "route" | "state" | "button";
    /** Nur bei advanceOn === "state": true, sobald der Schritt erledigt ist. */
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

// Von beiden Rundgängen geteilter Schritt: Flächen anlegen/bearbeiten.
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
 * Rundgang durch die geladenen Beispieldaten (Variante b): führt im Kontext von
 * Feldern → Szenarien → Zuweisung → Zusammenfassung, ohne in Formulare zu ziehen.
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
        title: "Beispiel-Szenario öffnen",
        body: "Öffnen Sie das Beispiel-Szenario ➔, um die zugewiesenen Flächen und Ergebnisse zu sehen.",
        placement: "bottom",
        advanceOn: "route",
    },
    {
        id: "open-assignment",
        route: (id) => `/projects/${id}`,
        target: "assignment-row",
        title: "Zuweisungen",
        body: "Jede Zeile ist eine Zuweisung: eine Fläche mit ihrer Nutzung und dem berechneten Bedarf. Ein Klick öffnet später die Details mit Berechnung und Zuschlägen.",
        placement: "bottom",
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
 * Rundgang für den Leerzustand: leitet Schritt für Schritt durch das Anlegen
 * eigener Daten. Jeder Schritt rückt automatisch vor, sobald die echte Aktion
 * erfolgt ist (Name gesetzt, Feld angelegt, Szenario erstellt, Nutzung zugewiesen).
 */
/**
 * Zustandsgesteuerter Schritt des Leerzustand-Rundgangs. Anders als der Demo-
 * Rundgang läuft dieser nicht über einen festen Index, sondern der aktive Schritt
 * ist immer der erste noch NICHT erledigte – abgeleitet aus dem echten App-Zustand.
 * So zeigt der Rundgang (auch nach Neustart aus dem ?-Dialog) stets den nächsten
 * sinnvollen Schritt, egal was schon angelegt ist.
 */
export interface EmptyStep {
    id: string;
    /** Ziel-Route; Funktion, falls die Projekt-ID gebraucht wird. */
    route: (ctx: TourContext) => string;
    /** data-tour-Wert des hervorzuhebenden Elements. */
    target: string;
    title: string;
    body: string;
    placement?: Placement;
    /** true, sobald der Schritt anhand des Zustands als erledigt gilt. */
    done: (ctx: TourContext) => boolean;
    /** Letzter Schritt: „Fertig“ statt „Weiter“. */
    terminal?: boolean;
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
        // Erledigt, sobald der Anwender die Szenarien-Seite (oder weiter) erreicht.
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
        // Erledigt, sobald die Zuweisungs-Seite offen ist ODER schon ein Modul gesetzt.
        done: (ctx) => onAssignmentPage(ctx) || hasAssignedModule(ctx),
    },
    {
        id: "configure-assignment", route: PROJ, target: "assignment-save",
        title: "Nutzung wählen & speichern",
        body: "Wählen Sie oben die Nutzung (z. B. Hauptkulturen oder Golf), füllen Sie die weiteren Angaben aus und speichern Sie die Zuweisung. Die App berechnet den Bedarf automatisch.",
        placement: "top",
        // Modul landet erst beim Speichern im Store → feuert nach dem Speichern.
        done: hasAssignedModule,
    },
    {
        id: "summary", route: PROJ, target: "project-summary",
        title: "Zusammenfassung & PDF",
        body: "Hier steht der Gesamtbedarf – und Sie können daraus das PDF für Ihren Antrag erzeugen. Fertig!",
        placement: "top",
        terminal: true,
        done: () => false, // Endschritt: bleibt bis „Fertig“.
    },
];

/**
 * Aktueller Schritt des Leerzustand-Rundgangs = erster noch nicht erledigter,
 * rein aus dem App-Zustand abgeleitet. So zeigt der Rundgang – auch nach Neustart
 * aus dem ?-Dialog – stets die nächste sinnvolle Aktion. Ist alles erledigt bis
 * auf den Endschritt, wird dieser gezeigt (bis „Fertig“).
 */
export const currentEmptyStep = (ctx: TourContext): EmptyStep | undefined => {
    for (const step of emptySteps) {
        if (step.terminal) return step;
        if (!step.done(ctx)) return step;
    }
    return undefined;
};

export const tourStepsFor = (variant: "demo" | "empty"): TourStep[] =>
    variant === "empty" ? [] : demoSteps;
