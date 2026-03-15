// src/lib/calculations/gemueseObst.ts
import {rawVegetableDataAj} from "../../constants/plantDataRaw";
import {allOtherPlants, refKwb, rFactor} from "../../constants/soilConstants";
import type {AnyPlantName, MonthValueType, NFkweClassName} from "../../types/dataTypes";
import {type Range} from "../../types/dataTypes";
import type {IrrigationPeriod, Scenario} from "../../types/project";
import {getMonthWeights} from "./irrigationWeights";
import {nFkweToRawIndex} from "./nFkweMapping";

export interface GemueseObstInput {
    plant: AnyPlantName;
    nFkweClass: NFkweClassName;
    areaHa: number;
    scenario: Scenario;
    irrigationPeriod: IrrigationPeriod;
    // Standort-Klimadaten (aus Field)
    precipitation: MonthValueType;
    et0: MonthValueType;
    // Zuschläge
    surchargeIntermediate: boolean;
    surchargeEmergence: number;
}

export interface GemueseObstResult {
    baseRangeMm: Range;           // Potsdam-Basiswert
    deltaKwb: number;             // Standortkorrektur (mm)
    correctionMm: number;         // ΔKWB × rFactor
    ajSuggestedMm: number | null; // Vorschlag aus Konstante
    optionalSurchargeMm: number;
    totalSurchargeMm: number;
    totalRangeMm: Range;
    totalRangeM3: Range;
    scenario: Scenario;
}

const addRange = (r: Range, mm: number): Range => [r[0] + mm, r[1] + mm];
const mmToM3 = (r: Range, ha: number): Range => [r[0] * ha * 10, r[1] * ha * 10];

export const calculateGemueseObst = (input: GemueseObstInput): GemueseObstResult => {
    const {
        plant, nFkweClass, areaHa, scenario, irrigationPeriod,
        precipitation, et0, surchargeIntermediate, surchargeEmergence,
    } = input;

    const rawData = allOtherPlants[plant];
    const rawIndex = nFkweToRawIndex(nFkweClass);
    const scenarioData = scenario === "dry" ? rawData[1] : rawData[0];
    const baseRangeMm = scenarioData[rawIndex] ?? [0, 0];

    // Monatliche Gewichtungen für den Bewässerungszeitraum
    const weights = getMonthWeights(irrigationPeriod);

    // ΔKWB = Σ ( (ET₀ - Niederschlag) - refKwb ) × Gewicht  über Bewässerungsmonate
    let deltaKwb = 0;
    for (const [monthStr, weight] of Object.entries(weights)) {
        const m = Number(monthStr); // Kalendermonat 1–12
        const idx = m - 1;          // Array-Index 0–11
        const localEt0 = et0[idx] ?? 0;
        const localPrecip = precipitation[idx] ?? 0;
        const ref = refKwb[idx] ?? 0;
        const localKwb = localEt0 - localPrecip;
        deltaKwb += (localKwb - ref) * (weight ?? 1);
    }

    // Korrektur = ΔKWB × rFactor
    const correctionMm = Math.round(deltaKwb * rFactor[nFkweClass]);

    // AJ-Vorschlag aus Konstante (nur Gemüse)
    const ajSuggestedMm = (rawVegetableDataAj as Record<string, number | null>)[plant] ?? null;

    // Optionale Zuschläge
    const optionalSurchargeMm =
        (surchargeIntermediate ? 10 : 0) +
        surchargeEmergence;

    const totalSurchargeMm = optionalSurchargeMm;

    const correctedBase = addRange(baseRangeMm as Range, correctionMm);
    const totalRangeMm = addRange(correctedBase, totalSurchargeMm);
    const totalRangeM3 = mmToM3(totalRangeMm, areaHa);

    return {
        baseRangeMm: baseRangeMm as Range,
        deltaKwb: Math.round(deltaKwb),
        correctionMm,
        ajSuggestedMm,
        optionalSurchargeMm,
        totalSurchargeMm,
        totalRangeMm,
        totalRangeM3,
        scenario,
    };
};

export const calculateGemueseObstBoth = (
    input: Omit<GemueseObstInput, "scenario">
): {normal: GemueseObstResult; dry: GemueseObstResult;} => ({
    normal: calculateGemueseObst({...input, scenario: "normal"}),
    dry: calculateGemueseObst({...input, scenario: "dry"}),
});
