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
    // Site climate data (from Field)
    precipitation: MonthValueType;
    et0: MonthValueType;
    // Surcharges (Spec Kapitel 4.3 only allows Auflaufbewässerung A/J — no Zwischenfrucht surcharge)
    surchargeEmergence: number;
    // User-defined (fallback if no literature value): mm/a
    userCustomMm?: number;
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
    // false if no literature value exists (table value null)
    hasValue: boolean;
    isUserCustom: boolean;
    userCustomMm: number;
}


const addRange = (r: Range, mm: number): Range => [r[0] + mm, r[1] + mm];
const cropRange = (r: Range, min?: Range): Range => [Math.max(r[0], min?.[0] ?? 0), Math.max(r[1], min?.[1] ?? 0)];
const mmToM3 = (r: Range, ha: number): Range => [r[0] * ha * 10, r[1] * ha * 10];

export const calculateGemueseObst = (input: GemueseObstInput): GemueseObstResult => {
    const {
        plant, nFkweClass, areaHa, scenario, irrigationPeriod,
        precipitation, et0, surchargeEmergence, userCustomMm,
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
            isUserCustom: false, userCustomMm: 0,
        };
    }
    const rawIndex = nFkweToRawIndex(nFkweClass);
    const scenarioData = scenario === "dry" ? rawData[1] : rawData[0];
    const rawBaseRange = scenarioData?.[rawIndex];
    const hasLiteratureValue = rawBaseRange !== null && rawBaseRange !== undefined;
    const isUserCustom = !hasLiteratureValue && userCustomMm !== undefined && userCustomMm > 0;
    const baseRangeMm: Range = hasLiteratureValue
        ? rawBaseRange
        : isUserCustom
            ? [userCustomMm!, userCustomMm!]
            : [0, 0];

    // Monthly weights for the irrigation period
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

    // Correction = ΔKWB × rFactor — omitted for user values (the user
    // states the demand directly, no site-specific climate correction)
    const correctionMm = isUserCustom ? 0 : Math.round(deltaKwb * rFactor[nFkweClass]);

    // AJ suggestion from constant (vegetables only)
    const ajSuggestedMm = (rawVegetableDataAj as Record<string, number | null>)[plant] ?? null;

    // Optional surcharges (only Auflaufbewässerung — Spec Kapitel 4.3)
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
        hasValue: hasLiteratureValue || isUserCustom,
        isUserCustom,
        userCustomMm: isUserCustom ? userCustomMm! : 0,
    };
};

export const calculateGemueseObstBoth = (
    input: Omit<GemueseObstInput, "scenario">
): {normal: GemueseObstResult; dry: GemueseObstResult;} => ({
    normal: calculateGemueseObst({...input, scenario: "normal"}),
    dry: calculateGemueseObst({...input, scenario: "dry"}),
});
