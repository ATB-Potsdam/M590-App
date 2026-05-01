// src/lib/calculations/gemueseObst.ts
import {rawVegetableDataAj} from "../../constants/plantDataRaw";
import {allOtherPlants, refKwb, rFactor} from "../../constants/soilConstants";
import type {AnyPlantName, MonthValueType, NFkweClassName, Scenario} from "../../types/dataTypes";
import {type Range} from "../../types/dataTypes";
import type {IrrigationPeriod} from "../../types/project";
import {getMonthWeights} from "./irrigationWeights";
import {nFkweToRawIndex} from "./nFkweMapping";

const MONTH_LABELS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

export interface GemueseObstInput {
    plant: AnyPlantName;
    nFkweClass: NFkweClassName;
    areaHa: number;
    scenario: Scenario;
    irrigationPeriod: IrrigationPeriod;
    // Standort-Klimadaten (aus Field)
    precipitation: MonthValueType;
    et0: MonthValueType;
    // Zuschläge (Spec § 4.3 erlaubt nur Auflaufbewässerung A/J — kein Zwischenfrucht-Zuschlag)
    surchargeEmergence: number;
}

export interface MonthlyClimateRow {
    label: string;         // "Apr"
    precip: number;
    et0: number;
    refKwbVal: number;
    localKwb: number;
    deltaKwb: number;
    weight: number;
    weightedDelta: number;
}

export interface GemueseObstResult {
    baseRangeMm: Range;
    deltaKwb: number;
    correctionMm: number;
    ajSuggestedMm: number | null;
    optionalSurchargeMm: number;
    surchargeEmergenceMm: number;
    totalSurchargeMm: number;
    totalRangeMm: Range;
    totalRangeM3: Range;
    scenario: Scenario;
    monthlyRows: MonthlyClimateRow[];
    // false wenn kein Literaturwert vorhanden (Tabellenwert null)
    hasValue: boolean;
}


const addRange = (r: Range, mm: number): Range => [r[0] + mm, r[1] + mm];
const cropRange = (r: Range, min?: Range): Range => [Math.max(r[0], min?.[0] ?? 0), Math.max(r[1], min?.[1] ?? 0)];
const mmToM3 = (r: Range, ha: number): Range => [r[0] * ha * 10, r[1] * ha * 10];

export const calculateGemueseObst = (input: GemueseObstInput): GemueseObstResult => {
    const {
        plant, nFkweClass, areaHa, scenario, irrigationPeriod,
        precipitation, et0, surchargeEmergence,
    } = input;

    const rawData = allOtherPlants[plant];
    if (!rawData) {
        // Plant not found in data tables (may have been renamed/removed between versions)
        const zero: Range = [0, 0];
        return {
            baseRangeMm: zero, deltaKwb: 0, correctionMm: 0, ajSuggestedMm: null,
            optionalSurchargeMm: 0, surchargeEmergenceMm: 0,
            totalSurchargeMm: 0, totalRangeMm: zero,
            totalRangeM3: zero, scenario, monthlyRows: [], hasValue: false,
        };
    }
    const rawIndex = nFkweToRawIndex(nFkweClass);
    const scenarioData = scenario === "dry" ? rawData[1] : rawData[0];
    const rawBaseRange = scenarioData?.[rawIndex];
    const hasValue = rawBaseRange !== null && rawBaseRange !== undefined;
    const baseRangeMm: Range = rawBaseRange ?? [0, 0];

    // Monatliche Gewichtungen für den Bewässerungszeitraum
    const weights = getMonthWeights(irrigationPeriod);
    const monthlyRows: MonthlyClimateRow[] = [];
    let deltaKwb = 0;

    for (const [monthStr, weight] of Object.entries(weights)) {
        const m = Number(monthStr);
        const idx = m - 1;
        const localEt0 = et0[idx] ?? 0;
        const localPrecip = precipitation[idx] ?? 0;
        const ref = refKwb[idx] ?? 0;
        const localKwb = localPrecip - localEt0;
        const delta = ref - localKwb;
        const weightedDelta = delta * (weight ?? 1);
        deltaKwb += weightedDelta;

        monthlyRows.push({
            label: MONTH_LABELS[idx],
            precip: Math.round(localPrecip),
            et0: Math.round(localEt0),
            refKwbVal: Math.round(ref),
            localKwb: Math.round(localKwb),
            deltaKwb: Math.round(delta),
            weight: weight ?? 1,
            weightedDelta: Math.round(weightedDelta),
        });
    }

    // Korrektur = ΔKWB × rFactor
    const correctionMm = Math.round(deltaKwb * rFactor[nFkweClass]);

    // AJ-Vorschlag aus Konstante (nur Gemüse)
    const ajSuggestedMm = (rawVegetableDataAj as Record<string, number | null>)[plant] ?? null;

    // Optionale Zuschläge (nur Auflaufbewässerung — Spec § 4.3)
    const surchargeEmergenceMm = surchargeEmergence;
    const optionalSurchargeMm = surchargeEmergenceMm;

    const totalSurchargeMm = optionalSurchargeMm;

    const correctedBase = addRange(baseRangeMm, correctionMm);
    const totalRangeMm = cropRange(addRange(correctedBase, totalSurchargeMm));
    const totalRangeM3 = mmToM3(totalRangeMm, areaHa);

    return {
        baseRangeMm,
        deltaKwb: Math.round(deltaKwb),
        correctionMm,
        ajSuggestedMm,
        optionalSurchargeMm,
        surchargeEmergenceMm,
        totalSurchargeMm,
        totalRangeMm,
        totalRangeM3,
        scenario,
        monthlyRows,
        hasValue,
    };
};

export const calculateGemueseObstBoth = (
    input: Omit<GemueseObstInput, "scenario">
): {normal: GemueseObstResult; dry: GemueseObstResult;} => ({
    normal: calculateGemueseObst({...input, scenario: "normal"}),
    dry: calculateGemueseObst({...input, scenario: "dry"}),
});
