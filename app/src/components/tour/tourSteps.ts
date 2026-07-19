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
export const emptySteps: TourStep[] = [
    {
        id: "farm-name",
        route: "/farm",
        target: "farm-name",
        title: "Betrieb benennen",
        body: "Geben Sie zuerst den Namen Ihres Betriebs ein und bestätigen Sie mit Enter oder dem Haken.",
        placement: "bottom",
        advanceOn: "state",
        done: hasFarmName,
    },
    fieldStep("state"),
    {
        // Nachdem die erste Fläche angelegt ist: der Anwender kann beliebig viele
        // weitere anlegen und bestätigt per „Weiter“, wenn alle erfasst sind.
        id: "add-more-fields",
        route: "/farm",
        target: "add-field",
        title: "Weitere Flächen?",
        body: "Legen Sie bei Bedarf weitere Flächen an. Wenn alle Ihre Flächen erfasst sind, geht es weiter.",
        placement: "top",
        advanceOn: "button",
    },
    {
        id: "nav-scenarios",
        route: "/farm",
        target: "nav-scenarios",
        title: "Zu den Szenarien",
        body: "Wechseln Sie unten zu Szenarien ➔ – dort legen Sie eine Bewässerungsberechnung an.",
        placement: "top",
        advanceOn: "route",
    },
    {
        id: "add-scenario",
        route: "/",
        target: "add-scenario",
        title: "Szenario anlegen",
        body: "Legen Sie mit „+ Neues Szenario“ Ihre erste Berechnung an (z. B. für ein bestimmtes Jahr).",
        placement: "top",
        advanceOn: "state",
        done: onProjectDetail,
    },
    {
        id: "assign-field",
        route: (id) => `/projects/${id}`,
        target: "add-assignment",
        title: "Fläche zuweisen",
        body: "Fügen Sie dem Szenario eine Ihrer Flächen hinzu.",
        placement: "top",
        advanceOn: "state",
        done: hasAssignment,
    },
    {
        // Auf der Szenario-Seite: die Zuweisung öffnen, um die Nutzung festzulegen.
        // Rückt vor, sobald die Zuweisungs-Seite geöffnet ist.
        id: "open-usage",
        route: (id) => `/projects/${id}`,
        target: "assignment-row",
        title: "Nutzung festlegen",
        body: "Öffnen Sie die Zuweisung („Nutzung wählen“), um die Art der Nutzung festzulegen.",
        placement: "bottom",
        advanceOn: "state",
        done: onAssignmentPage,
    },
    {
        // Auf der Zuweisungs-Seite: Modul wählen, modulabhängige Angaben ausfüllen,
        // speichern. Das Modul landet erst beim Speichern im Store – deshalb rückt
        // der Schritt über hasAssignedModule vor (feuert nach dem Speichern).
        // Ziel ist der Speichern-Button unten, damit der Fokus nach der Modulwahl
        // (die App scrollt dann nach unten) im aktiven Eingabebereich liegt.
        id: "configure-assignment",
        route: (id) => `/projects/${id}`,
        target: "assignment-save",
        title: "Nutzung wählen & speichern",
        body: "Wählen Sie oben die Nutzung (z. B. Hauptkulturen oder Golf), füllen Sie die weiteren Angaben aus und speichern Sie die Zuweisung. Die App berechnet den Bedarf automatisch.",
        placement: "top",
        advanceOn: "state",
        done: hasAssignedModule,
    },
    {
        // Wie bei den Flächen: der Anwender kann weitere Flächen zuweisen (je mit
        // eigener Nutzung) und bestätigt per „Weiter“, wenn alle zugewiesen sind.
        id: "add-more-assignments",
        route: (id) => `/projects/${id}`,
        target: "add-assignment",
        title: "Weitere Zuweisungen?",
        body: "Zurück im Szenario können Sie bei Bedarf weitere Flächen zuweisen und jeweils die Nutzung wählen. Wenn alle zugewiesen sind, geht es weiter.",
        placement: "top",
        advanceOn: "button",
    },
    {
        id: "summary",
        route: (id) => `/projects/${id}`,
        target: "project-summary",
        title: "Zusammenfassung & PDF",
        body: "Hier steht der Gesamtbedarf – und Sie können daraus das PDF für Ihren Antrag erzeugen. Fertig!",
        placement: "top",
        advanceOn: "button",
    },
];

export const tourStepsFor = (variant: "demo" | "empty"): TourStep[] =>
    variant === "empty" ? emptySteps : demoSteps;
