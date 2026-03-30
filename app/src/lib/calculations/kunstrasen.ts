// src/lib/calculations/kunstrasen.ts
// DWA-M 590, Kap. 4.4.5: Kunststoffrasenflächen
// Befeuchtungswasserbedarf = Wochen × mm/Woche × Fläche / 1000
import type {Range} from "../../types/dataTypes";

export interface KunstrasenInput {
    /** Field area in hectares */
    areaHa: number;
    /** Wochen pro Saison mit Befeuchtungsbedarf (typisch 15–20) */
    weeks: number;
    /** Befeuchtungsintensität in mm/Woche (15–50, 5mm-Schritte) */
    mmPerWeek: number;
}

export interface KunstrasenResult {
    areaHa: number;
    weeks: number;
    mmPerWeek: number;
    /** Jahreswert in mm/a */
    annualMm: number;
    /** Wasserbedarf in m³/a — as Range for consistency with other modules */
    totalRangeMm: Range;
    totalRangeM3: Range;
}

export const calculateKunstrasen = ({areaHa, weeks, mmPerWeek}: KunstrasenInput): KunstrasenResult => {
    const annualMm = weeks * mmPerWeek;
    const annualM3 = annualMm * areaHa * 10; // mm/a × ha × 10 = m³/a

    return {
        areaHa,
        weeks,
        mmPerWeek,
        annualMm,
        totalRangeMm: [annualMm, annualMm],
        totalRangeM3: [annualM3, annualM3],
    };
};
