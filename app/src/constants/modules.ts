// src/constants/modules.ts
import type {ModuleType} from "../types/project";

export interface ModuleDefinition {
    type: ModuleType;
    icon: string;
    label: string;
}

export const MODULES: ModuleDefinition[] = [
    {type: "hauptkulturen", icon: "🌾", label: "Hauptkulturen"},
    {type: "gemuese_obst", icon: "🥦", label: "Gemüse/​Obst"},
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
