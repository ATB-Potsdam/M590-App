// src/lib/calculations/getAssignmentResult.ts
import type {AnyPlantName, CropName, KwbZone, NFkweClassName} from "../../types/dataTypes";
import type {Field} from "../../types/farm";
import type {FieldAssignment, ModuleType} from "../../types/project";
import {hasDryYearScenario} from "../../constants/modules";
import {calculateGemueseObstBoth, type GemueseObstResult} from "./gemueseObst";
import type {HauptkulturenResult} from "./hauptkulturen";
import {calculateHauptkulturenBoth} from "./hauptkulturen";
import {calculateGruenflaechen, type GruenflaechenResult} from "./gruenflaechen";
import type {FllMoisture, FllSoil, FllSun, FllVegetation} from "./gruenflaechen";
import {calculateWeinbauBoth, type WeinbauResult} from "./weinbau";
import {calculateNaturrasen, type NaturrasenResult} from "./naturrasen";
import {calculateGolf, type GolfResult} from "./golf";
import {calculateKunstrasen, type KunstrasenResult} from "./kunstrasen";
import {calculateTennen, type TennenResult} from "./tennen";
import {annualPrecipitationMm} from "./annualPrecipitation";

export interface AssignmentResult {
    normal?: HauptkulturenResult | GemueseObstResult | WeinbauResult | GruenflaechenResult | NaturrasenResult | GolfResult | KunstrasenResult | TennenResult;
    dry?: HauptkulturenResult | GemueseObstResult | WeinbauResult | GruenflaechenResult | NaturrasenResult | GolfResult | KunstrasenResult | TennenResult;
    /** Alternative water sources in m³/a (only Grünflächen and sports-area modules) */
    altWasserM3?: number;
    /** Field area in ha — for weighted mm/a calculation in sumResults */
    areaHa: number;
    /**
     * The module this result came from. sumResults() needs it to keep the
     * modules without a Trockenjahr out of the scenario sums — see
     * hasDryYearScenario().
     */
    module: ModuleType;
}

export const getAssignmentResult = (
    fa: FieldAssignment,
    field: Field,
): AssignmentResult | null => {
  try {
    if (
        fa.module === "hauptkulturen" &&
        fa.plantKey &&
        field.climateClassStatus === "done" &&
        field.climateClass &&
        field.nFkweClass
    ) {
        const input = {
            crop: fa.plantKey as CropName,
            nFkweClass: field.nFkweClass as NFkweClassName,
            kwbZone: field.climateClass[0] as KwbZone,
            areaHa: field.areaHa,
            surchargeIntermediate: fa.surchargeIntermediate,
            surchargeEmergence: fa.surchargeEmergence,
            surchargeHeavySoil: fa.surchargeHeavySoil,
            isTablePotato: fa.isTablePotato,
            isSummerCereal: fa.isSummerCereal,
            userCustomMm: fa.userCustomMm,
            spanPosition: fa.spanPosition,
        };

        const {normal, dry} = calculateHauptkulturenBoth(input);
        return {normal, dry, areaHa: field.areaHa, module: fa.module};
    }
    if (
        fa.module === "gemuese_obst" &&
        fa.plantKey &&
        fa.irrigationPeriod &&
        field.climateDataStatus === "done" &&
        field.climateData &&
        field.nFkweClass
    ) {
        const input = {
            plant: fa.plantKey as AnyPlantName,
            nFkweClass: field.nFkweClass,
            areaHa: field.areaHa,
            irrigationPeriod: fa.irrigationPeriod,
            precipitation: field.climateData.precipitation,
            et0: field.climateData.et0,
            surchargeEmergence: fa.surchargeEmergence,
            userCustomMm: fa.userCustomMm,
            spanPosition: fa.spanPosition,
        };

        const {normal, dry} = calculateGemueseObstBoth(input);
        return {normal, dry, areaHa: field.areaHa, module: fa.module};
    }

    if (
        fa.module === "weinbau" &&
        field.climateDataStatus === "done" &&
        field.climateData &&
        field.nFkweClass
    ) {
        const annualPrecipMm = annualPrecipitationMm(field.climateData.precipitation);
        if (annualPrecipMm === null) return null;

        const input = {
            nFkweClass: field.nFkweClass as NFkweClassName,
            annualPrecipMm,
            areaHa: field.areaHa,
            isJunganlage: fa.isJunganlage ?? false,
        };

        const {normal, dry} = calculateWeinbauBoth(input);
        return {normal, dry, areaHa: field.areaHa, module: fa.module};
    }

    if (
        fa.module === "gruenflaechen" &&
        fa.fllVegetation &&
        fa.fllMoisture &&
        fa.fllSoil &&
        fa.fllSun &&
        field.climateDataStatus === "done" &&
        field.climateData
    ) {
        const result = calculateGruenflaechen({
            vegetation: fa.fllVegetation as FllVegetation,
            moisture: fa.fllMoisture as FllMoisture,
            soil: fa.fllSoil as FllSoil,
            sun: fa.fllSun as FllSun,
            areaHa: field.areaHa,
            et0: field.climateData.et0,
            periodStart: fa.fllPeriodStart ?? 4,
            periodEnd: fa.fllPeriodEnd ?? 9,
        });
        // Grünflächen has no scenario differentiation — store as normal only
        return {normal: result, altWasserM3: fa.altWasserM3, areaHa: field.areaHa, module: fa.module};
    }

    if (
        fa.module === "naturrasen" &&
        field.climateDataStatus === "done" &&
        field.climateData
    ) {
        const annualPrecipMm = annualPrecipitationMm(field.climateData.precipitation);
        if (annualPrecipMm === null) return null;
        const result = calculateNaturrasen({annualPrecipMm, areaHa: field.areaHa});
        return {normal: result, altWasserM3: fa.altWasserM3, areaHa: field.areaHa, module: fa.module};
    }

    if (
        fa.module === "golf" &&
        fa.golfGreensM2 != null &&
        fa.golfTeeM2 != null &&
        fa.golfFairwayM2 != null &&
        field.climateDataStatus === "done" &&
        field.climateData
    ) {
        const annualPrecipMm = annualPrecipitationMm(field.climateData.precipitation);
        if (annualPrecipMm === null) return null;
        const result = calculateGolf({
            annualPrecipMm,
            greensM2: fa.golfGreensM2,
            teeM2: fa.golfTeeM2,
            fairwayM2: fa.golfFairwayM2,
        });
        return {normal: result, altWasserM3: fa.altWasserM3, areaHa: field.areaHa, module: fa.module};
    }

    if (
        fa.module === "kunstrasen" &&
        fa.kunstrasenWeeks != null &&
        fa.kunstrasenMmPerWeek != null
    ) {
        const result = calculateKunstrasen({
            areaHa: field.areaHa,
            weeks: fa.kunstrasenWeeks,
            mmPerWeek: fa.kunstrasenMmPerWeek,
        });
        return {normal: result, altWasserM3: fa.altWasserM3, areaHa: field.areaHa, module: fa.module};
    }

    if (
        fa.module === "tennen" &&
        field.climateDataStatus === "done" &&
        field.climateData
    ) {
        const annualPrecipMm = annualPrecipitationMm(field.climateData.precipitation);
        if (annualPrecipMm === null) return null;
        const result = calculateTennen({annualPrecipMm, areaHa: field.areaHa});
        return {normal: result, altWasserM3: fa.altWasserM3, areaHa: field.areaHa, module: fa.module};
    }

    return null;
  } catch (e) {
    console.error("getAssignmentResult failed for field", field?.name, e);
    return null;
  }
};

export interface SummedResults {
    /** Normaljahr sum over the crop modules only */
    normalM3: [number, number] | null;
    normalAreaHa: number;
    /** Mittleres Trockenjahr sum over the crop modules only */
    dryM3: [number, number] | null;
    dryAreaHa: number;
    /**
     * Sum over the modules the Merkblatt gives a single Jahresrichtwert for
     * (Grün-/Sportflächen, Golf, Kunstrasen, Tennen). Deliberately outside both
     * scenario sums — see hasDryYearScenario(). null when the project has none.
     */
    yearlyM3: [number, number] | null;
    yearlyAreaHa: number;
    /** Number of assignments contributing to yearlyM3 */
    yearlyCount: number;
    totalAltWasserM3: number;
    nettoM3: [number, number] | null;
    nettoYearlyM3: [number, number] | null;
}

// Sums m³/a ranges across all assignments (mm/a is derived by the caller from volume ÷ area).
//
// Three sums, not two: the crop modules carry a Normaljahr and a Trockenjahr
// value, the sport/green modules carry one Jahresrichtwert that belongs to
// neither scenario. Folding the latter into the Normaljahr sum (as this did
// until 2026-08-19) labelled it as a scenario value it is not, and left the
// Trockenjahr sum quietly incomplete.
export const sumResults = (results: AssignmentResult[]): SummedResults => {
    let normalM3Min = 0, normalM3Max = 0, normalAreaHa = 0, hasNormal = false;
    let dryM3Min = 0, dryM3Max = 0, dryAreaHa = 0, hasDry = false;
    let yearlyM3Min = 0, yearlyM3Max = 0, yearlyAreaHa = 0, yearlyCount = 0;
    let totalAltWasserM3 = 0;
    // Alternative water belonging to the scenario-free block, so each netto
    // figure only deducts the sources of the areas it actually covers.
    let yearlyAltWasserM3 = 0;

    results.forEach((r) => {
        const scenarioBearing = hasDryYearScenario(r.module);
        const normalHasValue = r.normal && (!('hasValue' in r.normal) || r.normal.hasValue);
        const dryHasValue = r.dry && (!('hasValue' in r.dry) || r.dry.hasValue);

        if (!scenarioBearing) {
            // Single Jahresrichtwert — stored as `normal` by the calculation
            // modules, but it is not a Normaljahr figure.
            if (normalHasValue && r.normal) {
                yearlyM3Min += r.normal.totalRangeM3[0];
                yearlyM3Max += r.normal.totalRangeM3[1];
                yearlyAreaHa += r.areaHa ?? 0;
                yearlyCount += 1;
            }
            if (r.altWasserM3) {
                yearlyAltWasserM3 += r.altWasserM3;
                totalAltWasserM3 += r.altWasserM3;
            }
            return;
        }

        if (normalHasValue && r.normal) {
            normalM3Min += r.normal.totalRangeM3[0];
            normalM3Max += r.normal.totalRangeM3[1];
            normalAreaHa += r.areaHa ?? 0;
            hasNormal = true;
        }
        if (dryHasValue && r.dry) {
            dryM3Min += r.dry.totalRangeM3[0];
            dryM3Max += r.dry.totalRangeM3[1];
            dryAreaHa += r.areaHa ?? 0;
            hasDry = true;
        }
        if (r.altWasserM3) {
            totalAltWasserM3 += r.altWasserM3;
        }
    });

    // Netto = gross minus alternative water sources (never negative). Crop and
    // scenario-free blocks deduct only their own sources; today only the
    // sport/green modules offer altWasserM3 at all, so cropAltWasserM3 is
    // normally 0 — computed rather than assumed so it stays correct if that
    // changes.
    const cropAltWasserM3 = totalAltWasserM3 - yearlyAltWasserM3;
    const nettoM3: [number, number] | null = hasNormal
        ? [Math.max(0, normalM3Min - cropAltWasserM3), Math.max(0, normalM3Max - cropAltWasserM3)]
        : null;
    const nettoYearlyM3: [number, number] | null = yearlyCount > 0
        ? [Math.max(0, yearlyM3Min - yearlyAltWasserM3), Math.max(0, yearlyM3Max - yearlyAltWasserM3)]
        : null;

    return {
        normalM3: hasNormal ? [normalM3Min, normalM3Max] : null,
        normalAreaHa,
        dryM3: hasDry ? [dryM3Min, dryM3Max] : null,
        dryAreaHa,
        yearlyM3: yearlyCount > 0 ? [yearlyM3Min, yearlyM3Max] : null,
        yearlyAreaHa,
        yearlyCount,
        totalAltWasserM3,
        nettoM3,
        nettoYearlyM3,
    };
};

export const getMissingData = (
    fa: FieldAssignment,
    field: Field
): string[] => {
    const missing: string[] = [];

    if (!fa.module) {
        missing.push("Nutzungsmodul");
        return missing; // The rest makes no sense without a module
    }

    if ((fa.module === "hauptkulturen" || fa.module === "gemuese_obst") && !fa.plantKey) {
        missing.push("Kultur");
    }

    if (fa.module === "gemuese_obst" && !fa.irrigationPeriod) {
        missing.push("Bewässerungszeitraum");
    }

    // Automatically derivable values (climate zone, climate data, nFKWe) are NOT
    // reported as errors when they are merely not loaded yet — they heal
    // themselves once the WASM/raster lookups are ready. Only report real errors.
    if (field.climateClassStatus === "error") {
        missing.push("Klimazone (Standort prüfen)");
    }

    if (field.climateDataStatus === "error") {
        missing.push("Klimadaten (Standort prüfen)");
    }

    if (!field.nFkweClass &&
        (fa.module === "hauptkulturen" || fa.module === "gemuese_obst" || fa.module === "weinbau")) {
        missing.push("nFKWe-Klasse");
    }

    if (fa.module === "gruenflaechen") {
        if (!fa.fllVegetation) missing.push("Vegetation (Faktor G)");
        if (!fa.fllMoisture) missing.push("Standortfeuchte (Faktor L)");
        if (!fa.fllSoil) missing.push("Bodenart (Faktor B)");
        if (!fa.fllSun) missing.push("Sonnenexposition (Faktor S)");
    }

    // Alt. water sources mandatory field (0 = "none available", undefined = not answered)
    if (
        fa.module === "gruenflaechen" ||
        fa.module === "naturrasen" ||
        fa.module === "golf" ||
        fa.module === "kunstrasen" ||
        fa.module === "tennen"
    ) {
        if (fa.altWasserM3 === undefined) missing.push("Alternative Wasserquellen");
    }

    return missing;
};