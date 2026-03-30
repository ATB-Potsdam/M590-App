// src/lib/calculations/naturrasen.ts
// DWA-M 590, Kap. 4.4.3, Tabelle 33: Naturrasensportplätze
import type {Range} from "../../types/dataTypes";

export type NaturrasenPrecipClass = "<500" | "500-700" | "700-900" | ">900";

/** Classify annual precipitation into Naturrasen precipitation classes (Tabelle 33) */
export const toNaturrasenPrecipClass = (annualPrecipMm: number): NaturrasenPrecipClass => {
    if (annualPrecipMm < 500) return "<500";
    if (annualPrecipMm < 700) return "500-700";
    if (annualPrecipMm < 900) return "700-900";
    return ">900";
};

// Tabelle 33: Mittlere Zusatzwasserbedarfe von Naturrasensportplätzen
// max === null bedeutet offene Spanne ("> min")
const TABLE_33: Record<NaturrasenPrecipClass, {min: number; max: number | null}> = {
    "<500":    {min: 250, max: null},  // > 250 mm/a
    "500-700": {min: 150, max: 250},
    "700-900": {min: 75,  max: 150},
    ">900":    {min: 0,   max: 75},
};

export interface NaturrasenInput {
    annualPrecipMm: number;
    areaHa: number;
}

export interface NaturrasenResult {
    precipClass: NaturrasenPrecipClass;
    annualPrecipMm: number;
    /** true when the upper bound is open ("> X") */
    isOpenRange: boolean;
    /** mm/a — lower bound of range */
    totalRangeMm: Range;
    /** m³/a — lower bound of range */
    totalRangeM3: Range;
}

export const calculateNaturrasen = ({annualPrecipMm, areaHa}: NaturrasenInput): NaturrasenResult => {
    const precipClass = toNaturrasenPrecipClass(annualPrecipMm);
    const {min, max} = TABLE_33[precipClass];
    const isOpenRange = max === null;

    const minMm = min;
    const maxMm = max ?? min; // use min as stand-in for summation purposes when open

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
