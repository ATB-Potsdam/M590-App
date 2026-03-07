// src/constants/scenarios.ts
import type {Scenario} from "../types/project";

export interface ScenarioDefinition {
    type: Scenario;
    icon: string;
    label: string;
    description: string;
}

export const SCENARIOS: ScenarioDefinition[] = [
    {type: "normal", icon: "🌤", label: "Normaljahr", description: "Durchschnittliches Witterungsjahr (50 %)"},
    {type: "dry", icon: "☀️", label: "Trockenjahr", description: "Vorsorgliche Bemessung (80 %)"},
    {type: "both", icon: "📊", label: "Beide anzeigen", description: "Normal- & Trockenjahr im Vergleich"},
];

export const getScenario = (type: Scenario): ScenarioDefinition =>
    SCENARIOS.find((s) => s.type === type)!;

export const getScenarioLabel = (type: Scenario): string =>
    getScenario(type).label;

export const getScenarioIcon = (type: Scenario): string =>
    getScenario(type).icon;
