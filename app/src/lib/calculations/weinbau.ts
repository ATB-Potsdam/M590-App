// src/lib/calculations/weinbau.ts
import type {NFkweClassName, Range, Scenario} from "../../types/dataTypes";

/**
 * Weinbau uses a simplified nFKWe grouping: "1-2", "3", "4", "5"
 * where "3" covers both "3a" and "3b" from the general classification.
 */
export type WeinbauNFkwe = "1-2" | "3" | "4" | "5";

export type PrecipitationClass = "<500" | "500-700" | "700-900";

/** Map full nFKWe class names to Weinbau groups */
export const toWeinbauNFkwe = (nFkweClass: NFkweClassName): WeinbauNFkwe => {
    if (nFkweClass === "3a" || nFkweClass === "3b") return "3";
    return nFkweClass as WeinbauNFkwe;
};

/** Classify annual precipitation into Weinbau precipitation classes */
export const toPrecipitationClass = (annualPrecipMm: number): PrecipitationClass => {
    if (annualPrecipMm < 500) return "<500";
    if (annualPrecipMm < 700) return "500-700";
    return "700-900";
};

/** Check if precipitation falls in the ~550mm range where Table 27 applies */
export const isGeisenheimRange = (annualPrecipMm: number): boolean =>
    annualPrecipMm >= 500 && annualPrecipMm <= 600;

// Tabelle 26: Durchschnittliche Zusatzwasserbedarfe nach Jahresniederschlag
const TABLE_26: Record<WeinbauNFkwe, Record<PrecipitationClass, number>> = {
    "1-2": {"<500": 70, "500-700": 50, "700-900": 40},
    "3":   {"<500": 45, "500-700": 15, "700-900": 0},
    "4":   {"<500": 25, "500-700": 0,  "700-900": 0},
    "5":   {"<500": 20, "500-700": 0,  "700-900": 0},
};

// Tabelle 27: Normaljahr / Trockenjahr für ~550mm Standorte (Geisenheim)
const TABLE_27: Record<WeinbauNFkwe, Record<Scenario, number>> = {
    "1-2": {normal: 50, dry: 63},
    "3":   {normal: 15, dry: 50},
    "4":   {normal: 0,  dry: 10},
    "5":   {normal: 0,  dry: 0},
};

export interface WeinbauInput {
    nFkweClass: NFkweClassName;
    annualPrecipMm: number;
    areaHa: number;
    isJunganlage: boolean;
}

export interface WeinbauResult {
    /** Basiswert from Table 26 (mm/a) */
    baseMm: number;
    /** Total as Range [same, same] for consistency with other modules */
    totalRangeMm: Range;
    /** m³/a as Range */
    totalRangeM3: Range;
    /** Which scenario this result represents */
    scenario: Scenario;
    /** nFKWe group used */
    weinbauNFkwe: WeinbauNFkwe;
    /** Precipitation class used */
    precipClass: PrecipitationClass;
    /** Annual precipitation at location */
    annualPrecipMm: number;
    /** Whether Junganlage override was applied */
    isJunganlage: boolean;
    /** Whether Table 27 scenario data is available for this location */
    hasScenarioData: boolean;
}

const calculateWeinbau = (input: WeinbauInput, scenario: Scenario): WeinbauResult => {
    const {nFkweClass, annualPrecipMm, areaHa, isJunganlage} = input;

    const weinbauNFkwe = isJunganlage ? "1-2" : toWeinbauNFkwe(nFkweClass);
    const precipClass = toPrecipitationClass(annualPrecipMm);
    const hasScenarioData = isGeisenheimRange(annualPrecipMm);

    let baseMm: number;
    if (hasScenarioData) {
        // Table 27 applies: use scenario-specific values
        baseMm = TABLE_27[weinbauNFkwe][scenario];
    } else {
        // Table 26: no scenario differentiation
        baseMm = TABLE_26[weinbauNFkwe][precipClass];
    }

    const totalRangeMm: Range = [baseMm, baseMm];
    const totalRangeM3: Range = [baseMm * areaHa * 10, baseMm * areaHa * 10];

    return {
        baseMm,
        totalRangeMm,
        totalRangeM3,
        scenario,
        weinbauNFkwe,
        precipClass,
        annualPrecipMm,
        isJunganlage,
        hasScenarioData,
    };
};

export const calculateWeinbauBoth = (
    input: WeinbauInput
): {normal: WeinbauResult; dry: WeinbauResult} => ({
    normal: calculateWeinbau(input, "normal"),
    dry: calculateWeinbau(input, "dry"),
});
