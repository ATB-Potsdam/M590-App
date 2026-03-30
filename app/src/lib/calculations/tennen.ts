// src/lib/calculations/tennen.ts
// DWA-M 590, Kap. 4.4.5, Tabelle 36: Tennenflächen
import type {Range} from "../../types/dataTypes";
import {toNaturrasenPrecipClass} from "./naturrasen";
import type {NaturrasenPrecipClass} from "./naturrasen";

// Tabelle 36: Mittlere Zusatzwasserbedarfe von Tennenflächen (DIN 18035-2:2020)
// max === null bedeutet offene Spanne ("> min")
const TABLE_36: Record<NaturrasenPrecipClass, {min: number; max: number | null}> = {
    "<500":    {min: 180, max: null},  // > 180 mm/a
    "500-700": {min: 120, max: 180},
    "700-900": {min: 60,  max: 120},
    ">900":    {min: 0,   max: 60},
};

export interface TennenInput {
    annualPrecipMm: number;
    areaHa: number;
}

export interface TennenResult {
    precipClass: NaturrasenPrecipClass;
    annualPrecipMm: number;
    /** true when the upper bound is open ("> X") */
    isOpenRange: boolean;
    /** mm/a range */
    totalRangeMm: Range;
    /** m³/a range */
    totalRangeM3: Range;
}

export const calculateTennen = ({annualPrecipMm, areaHa}: TennenInput): TennenResult => {
    const precipClass = toNaturrasenPrecipClass(annualPrecipMm);
    const {min, max} = TABLE_36[precipClass];
    const isOpenRange = max === null;

    const minMm = min;
    const maxMm = max ?? min;

    const totalRangeMm: Range = [minMm, maxMm];
    const totalRangeM3: Range = [minMm * areaHa * 10, maxMm * areaHa * 10];

    return {
        precipClass,
        annualPrecipMm,
        isOpenRange,
        totalRangeMm,
        totalRangeM3,
    };
};
