// src/lib/calculations/kunstrasen.ts
// DWA-M 590, Kap. 4.4.5: artificial turf areas (Kunststoffrasenflächen)
// Wetting water demand = weeks × mm/week × area / 1000
import type {Range} from "../../types/dataTypes";

export interface KunstrasenInput {
    /** Field area in hectares */
    areaHa: number;
    /** Weeks per season with wetting demand (typically 15–20) */
    weeks: number;
    /** Wetting intensity in mm/week (15–50, 5 mm steps) */
    mmPerWeek: number;
}

export interface KunstrasenResult {
    areaHa: number;
    weeks: number;
    mmPerWeek: number;
    /** Annual value in mm/a */
    annualMm: number;
    /** Water demand in m³/a — as Range for consistency with other modules */
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
