// src/lib/calculations/hauptkulturen.ts
import {additionWaterDryYear, additionWaterNormYear, type CropAdditionalWater} from "../../constants/soilConstants";
import type {CropName, KwbZone, NFkweClassName, Range, Scenario} from "../../types/dataTypes";

export interface HauptkulturenInput {
    crop: CropName;
    nFkweClass: NFkweClassName;
    kwbZone: KwbZone;
    areaHa: number;
    scenario: Scenario;
    // Zuschläge
    surchargeIntermediate: boolean;  // +10 mm
    surchargeEmergence: number;      // 0–20 mm
    surchargeHeavySoil: number;      // 0–20 mm (nur Kartoffeln)
}

export interface HauptkulturenResult {
    // Basiswert aus Tabelle (mm/a) als Range
    baseRangeMm: Range;
    // Automatischer Zuschlag (mm)
    autoSurchargeMm: number;
    // Optionale Zuschläge (mm)
    optionalSurchargeMm: number;
    // Gesamtzuschlag (mm)
    totalSurchargeMm: number;
    // Gesamtbedarf (mm/a) als Range
    totalRangeMm: Range;
    // Wasserbedarf (m³/a) als Range
    totalRangeM3: Range;
    // Verwendetes Szenario
    scenario: Scenario;
}

// Automatischer Zuschlag je Kultur
const AUTO_SURCHARGE_MM: Partial<Record<CropName, number>> = {
    "Kartoffeln": 20,
    "Silomais": 20,
};

const getTableValue = (
    kwbZone: KwbZone,
    crop: CropName,
    nFkweClass: NFkweClassName,
    scenario: Scenario
): Range => {
    const table: CropAdditionalWater =
        scenario === "dry" ? additionWaterDryYear : additionWaterNormYear;
    return table[kwbZone][crop][nFkweClass];
};

export const calculateHauptkulturen = (input: HauptkulturenInput): HauptkulturenResult => {
    const {crop, nFkweClass, kwbZone, areaHa, scenario,
        surchargeIntermediate, surchargeEmergence, surchargeHeavySoil} = input;

    const baseRangeMm = getTableValue(kwbZone, crop, nFkweClass, scenario);

    // Automatischer Zuschlag
    const autoSurchargeMm = AUTO_SURCHARGE_MM[crop] ?? 0;

    // Optionale Zuschläge
    const optionalSurchargeMm =
        (surchargeIntermediate ? 10 : 0) +
        surchargeEmergence +
        surchargeHeavySoil;

    const totalSurchargeMm = autoSurchargeMm + optionalSurchargeMm;

    const totalRangeMm: Range = [
        baseRangeMm[0] + totalSurchargeMm,
        baseRangeMm[1] + totalSurchargeMm,
    ];

    // mm/a × ha × 10 = m³/a
    const totalRangeM3: Range = [
        totalRangeMm[0] * areaHa * 10,
        totalRangeMm[1] * areaHa * 10,
    ];

    return {
        baseRangeMm,
        autoSurchargeMm,
        optionalSurchargeMm,
        totalSurchargeMm,
        totalRangeMm,
        totalRangeM3,
        scenario,
    };
};

// Für Szenario "both": beide Ergebnisse berechnen
export const calculateHauptkulturenBoth = (
    input: Omit<HauptkulturenInput, "scenario">
): {normal: HauptkulturenResult; dry: HauptkulturenResult;} => ({
    normal: calculateHauptkulturen({...input, scenario: "normal"}),
    dry: calculateHauptkulturen({...input, scenario: "dry"}),
});
