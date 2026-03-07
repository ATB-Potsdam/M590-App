// src/constants/modules.ts
import type {ModuleType} from "../types/project";

export interface ModuleDefinition {
    type: ModuleType;
    icon: string;
    label: string;
}

export const MODULES: ModuleDefinition[] = [
    {type: "hauptkulturen", icon: "🌾", label: "Hauptkulturen"},
    {type: "gemuese_obst", icon: "🥦", label: "Gemüse / Obst"},
    {type: "weinbau", icon: "🍷", label: "Weinbau"},
    {type: "gruenflaechen", icon: "🌿", label: "Grünflächen"},
    {type: "naturrasen", icon: "⚽", label: "Naturrasensportplatz"},
    {type: "golf", icon: "⛳", label: "Golfplatz"},
    {type: "kunstrasen", icon: "🏟", label: "Kunstrasen"},
    {type: "tennen", icon: "🟫", label: "Tennenfläche"},
];

// Lookup-Hilfsfunktionen
export const getModule = (type: ModuleType): ModuleDefinition =>
    MODULES.find((m) => m.type === type)!;

export const getModuleLabel = (type: ModuleType): string =>
    getModule(type).label;

export const getModuleIcon = (type: ModuleType): string =>
    getModule(type).icon;
