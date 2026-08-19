// src/constants/modules.ts
import type {ModuleType} from "../types/project";

export interface ModuleDefinition {
    type: ModuleType;
    icon: string;
    /** Short label — used in tables, badges and the PDF, where width is tight. */
    label: string;
    /**
     * Long label for the module picker, where there is room to be precise.
     * Only set where the short label understates the module's scope.
     */
    longLabel?: string;
}

export const MODULES: ModuleDefinition[] = [
    {type: "hauptkulturen", icon: "🌾", label: "Hauptkulturen"},
    // Covers far more than vegetables and fruit — also medicinal, agricultural and
    // fodder plants (see PLANT_CATEGORIES). The picker says so, otherwise users search
    // for e.g. Soja or Hopfen in the wrong module. The short label stays short because
    // it also renders in the summary table, the module badges and the PDF.
    {
        type: "gemuese_obst", icon: "🥦", label: "Gemüse/​Obst",
        longLabel: "Gemüse/​Obst & Sonderkulturen",
    },
    {type: "weinbau", icon: "🍷", label: "Weinbau"},
    {type: "gruenflaechen", icon: "🌿", label: "Grünflächen"},
    {type: "naturrasen", icon: "⚽", label: "Naturrasensportplatz"},
    {type: "golf", icon: "⛳", label: "Golfplatz"},
    {type: "kunstrasen", icon: "🏟", label: "Kunstrasen"},
    {type: "tennen", icon: "🟫", label: "Tennenfläche"},
];

// Lookup helper functions
export const getModule = (type: ModuleType): ModuleDefinition =>
    MODULES.find((m) => m.type === type)!;

export const getModuleLabel = (type: ModuleType): string =>
    getModule(type).label;

export const getModuleIcon = (type: ModuleType): string =>
    getModule(type).icon;

// Agricultural modules use the term "Schlag"/"Feld".
// Sports/green areas (e.g. Golf) do not use this terminology → "Fläche".
const AGRICULTURAL_MODULES: ReadonlySet<ModuleType> = new Set([
    "hauptkulturen", "gemuese_obst", "weinbau",
]);

// Modules whose mm/a is referenced to irrigated sub-areas rather than the field
// area: golf splits the course into greens/tees/fairways (Table 35) and averages
// mm/a over their sum, which is well below the field area entered by the user.
// Its mm/a therefore cannot be compared with the field-referenced mm/a of the
// other modules — flag it where both appear side by side.
export const isSubAreaModule = (type: ModuleType | undefined): boolean =>
    type === "golf";

// Modules that distinguish Normaljahr from mittleres Trockenjahr. The crop
// modules read both scenarios from the literature tables; the sport and green
// modules are dimensioned from area, precipitation and evaporation and the
// Merkblatt gives them a single Jahresrichtwert — no dry-year variant exists.
//
// Their demand must therefore NOT be folded into either scenario sum: doing so
// reported an area's Jahresrichtwert as if it were a Normaljahr figure while the
// Trockenjahr sum silently omitted it (working-group decision 2026-08-19, tester
// feedback items 15 and 22). It is summed and shown on its own instead.
//
// Deliberately a separate predicate from AGRICULTURAL_MODULES, which answers a
// different question (terminology: "Feld" vs. "Fläche") and happens to hold the
// same members today.
const DRY_YEAR_MODULES: ReadonlySet<ModuleType> = new Set([
    "hauptkulturen", "gemuese_obst", "weinbau",
]);

export const hasDryYearScenario = (type: ModuleType | undefined): boolean =>
    !!type && DRY_YEAR_MODULES.has(type);

// Suitable area label for a context without agricultural modules
// (e.g. pure golf-course projects). `modules` = all modules used in the context.
export const fieldTerm = (
    modules: readonly (ModuleType | undefined)[],
    plural = false,
): string => {
    const hasAgricultural = modules.some((m) => m && AGRICULTURAL_MODULES.has(m));
    if (hasAgricultural) return plural ? "Felder" : "Feld";
    return plural ? "Flächen" : "Fläche";
};
