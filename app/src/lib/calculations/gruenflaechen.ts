// src/lib/calculations/gruenflaechen.ts
// FLL method: ETt = ET₀ × L × G × B × S
import type {MonthValueType, Range} from "../../types/dataTypes";

export type FllVegetation = "rasen" | "stauden" | "baeume";
export type FllMoisture = "trocken" | "frisch" | "feucht";
export type FllSoil = "sand" | "sandiger_lehm" | "lehm";
export type FllSun = "schatten" | "halbschatten" | "sonne";

// Tabelle: Faktor G (Vegetation / Blattmasse)
const FACTOR_G: Record<FllVegetation, number> = {
    rasen: 0.8,
    stauden: 1.0,
    baeume: 1.3,
};

// Tabelle: Faktor L (Lebensbereich / Standortfeuchte)
const FACTOR_L: Record<FllMoisture, number> = {
    trocken: 0.6,
    frisch: 1.0,
    feucht: 1.6,
};

// Tabelle: Faktor B (Bodenart)
const FACTOR_B: Record<FllSoil, number> = {
    sand: 1.5,
    sandiger_lehm: 1.0,
    lehm: 0.8,
};

// Tabelle: Faktor S (Sonnenexposition)
const FACTOR_S: Record<FllSun, number> = {
    schatten: 0.7,
    halbschatten: 1.0,
    sonne: 1.3,
};

export const getFactorG = (v: FllVegetation): number => FACTOR_G[v];
export const getFactorL = (m: FllMoisture): number => FACTOR_L[m];
export const getFactorB = (s: FllSoil): number => FACTOR_B[s];
export const getFactorS = (s: FllSun): number => FACTOR_S[s];

/** Labels for display */
export const VEGETATION_OPTIONS: {value: FllVegetation; label: string}[] = [
    {value: "rasen", label: "Rasen / Bodendecker"},
    {value: "stauden", label: "Stauden / Kleinsträucher"},
    {value: "baeume", label: "Großsträucher / Bäume"},
];

export const MOISTURE_OPTIONS: {value: FllMoisture; label: string}[] = [
    {value: "trocken", label: "Trockener Standort"},
    {value: "frisch", label: "Frischer Standort"},
    {value: "feucht", label: "Feuchter Standort"},
];

export const SOIL_OPTIONS: {value: FllSoil; label: string}[] = [
    {value: "sand", label: "Sand"},
    {value: "sandiger_lehm", label: "Sandiger Lehm"},
    {value: "lehm", label: "Lehm / Schluff / Ton"},
];

export const SUN_OPTIONS: {value: FllSun; label: string}[] = [
    {value: "schatten", label: "Schatten"},
    {value: "halbschatten", label: "Halbschatten"},
    {value: "sonne", label: "Volle Sonne"},
];

export interface GruenflaechenInput {
    vegetation: FllVegetation;
    moisture: FllMoisture;
    soil: FllSoil;
    sun: FllSun;
    areaHa: number;
    /** ET₀ monthly values from raster (mm/month) */
    et0: MonthValueType;
    /** Vegetation period: start month (1-12, default 4=April) */
    periodStart: number;
    /** Vegetation period: end month (1-12, default 9=September) */
    periodEnd: number;
}

export interface GruenflaechenResult {
    /** FLL factor values */
    factorG: number;
    factorL: number;
    factorB: number;
    factorS: number;
    /** Combined factor product */
    factorProduct: number;
    /** Average daily ET₀ in the vegetation period (mm/d) */
    avgDailyEt0: number;
    /** ETt = ET₀ × factors (mm/d) */
    ettMmPerDay: number;
    /** Days in the vegetation period */
    periodDays: number;
    /** Total mm in period */
    totalRangeMm: Range;
    /** Total m³ in period */
    totalRangeM3: Range;
    /** Period description */
    periodStart: number;
    periodEnd: number;
}

/** Approximate days per month */
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Count days in a month range (inclusive, 1-indexed) */
const countDays = (startMonth: number, endMonth: number): number => {
    let days = 0;
    for (let m = startMonth; m <= endMonth; m++) {
        days += DAYS_IN_MONTH[m - 1];
    }
    return days;
};

/** Average daily ET₀ over a month range from monthly totals */
const avgDailyEt0InPeriod = (et0: MonthValueType, startMonth: number, endMonth: number): number => {
    let totalEt0 = 0;
    let totalDays = 0;
    for (let m = startMonth; m <= endMonth; m++) {
        const val = et0[m - 1];
        if (val != null) {
            totalEt0 += val;
            totalDays += DAYS_IN_MONTH[m - 1];
        }
    }
    return totalDays > 0 ? totalEt0 / totalDays : 0;
};

export const calculateGruenflaechen = (input: GruenflaechenInput): GruenflaechenResult => {
    const {vegetation, moisture, soil, sun, areaHa, et0, periodStart, periodEnd} = input;

    const factorG = getFactorG(vegetation);
    const factorL = getFactorL(moisture);
    const factorB = getFactorB(soil);
    const factorS = getFactorS(sun);
    const factorProduct = factorL * factorG * factorB * factorS;

    const avgDailyEt0 = avgDailyEt0InPeriod(et0, periodStart, periodEnd);
    const ettMmPerDay = Math.round(avgDailyEt0 * factorProduct * 100) / 100;
    const periodDays = countDays(periodStart, periodEnd);

    const totalMm = Math.round(ettMmPerDay * periodDays);
    const totalM3 = totalMm * areaHa * 10;

    return {
        factorG,
        factorL,
        factorB,
        factorS,
        factorProduct,
        avgDailyEt0,
        ettMmPerDay,
        periodDays,
        totalRangeMm: [totalMm, totalMm],
        totalRangeM3: [totalM3, totalM3],
        periodStart,
        periodEnd,
    };
};
