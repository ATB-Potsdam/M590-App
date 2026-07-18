// src/lib/calculations/getAssignmentResult.ts
import type {AnyPlantName, CropName, KwbZone, NFkweClassName} from "../../types/dataTypes";
import type {Field} from "../../types/farm";
import type {FieldAssignment} from "../../types/project";
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

export interface AssignmentResult {
    normal?: HauptkulturenResult | GemueseObstResult | WeinbauResult | GruenflaechenResult | NaturrasenResult | GolfResult | KunstrasenResult | TennenResult;
    dry?: HauptkulturenResult | GemueseObstResult | WeinbauResult | GruenflaechenResult | NaturrasenResult | GolfResult | KunstrasenResult | TennenResult;
    /** Alternative Wasserquellen in m³/a (nur Grünflächen- und Sportflächenmodule) */
    altWasserM3?: number;
    /** Feldfläche in ha — für gewichtete mm/a-Berechnung in sumResults */
    areaHa: number;
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
        };

        const {normal, dry} = calculateHauptkulturenBoth(input);
        return {normal, dry, areaHa: field.areaHa};
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
        };

        const {normal, dry} = calculateGemueseObstBoth(input);
        return {normal, dry, areaHa: field.areaHa};
    }

    if (
        fa.module === "weinbau" &&
        field.climateDataStatus === "done" &&
        field.climateData &&
        field.nFkweClass
    ) {
        const annualPrecipMm = field.climateData.precipitation
            .reduce((sum: number, v: number | null) => sum + (v ?? 0), 0);

        const input = {
            nFkweClass: field.nFkweClass as NFkweClassName,
            annualPrecipMm,
            areaHa: field.areaHa,
            isJunganlage: fa.isJunganlage ?? false,
        };

        const {normal, dry} = calculateWeinbauBoth(input);
        return {normal, dry, areaHa: field.areaHa};
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
        return {normal: result, altWasserM3: fa.altWasserM3, areaHa: field.areaHa};
    }

    if (
        fa.module === "naturrasen" &&
        field.climateDataStatus === "done" &&
        field.climateData
    ) {
        const annualPrecipMm = field.climateData.precipitation
            .reduce((sum: number, v: number | null) => sum + (v ?? 0), 0);
        const result = calculateNaturrasen({annualPrecipMm, areaHa: field.areaHa});
        return {normal: result, altWasserM3: fa.altWasserM3, areaHa: field.areaHa};
    }

    if (
        fa.module === "golf" &&
        fa.golfGreensM2 != null &&
        fa.golfTeeM2 != null &&
        fa.golfFairwayM2 != null &&
        field.climateDataStatus === "done" &&
        field.climateData
    ) {
        const annualPrecipMm = field.climateData.precipitation
            .reduce((sum: number, v: number | null) => sum + (v ?? 0), 0);
        const result = calculateGolf({
            annualPrecipMm,
            greensM2: fa.golfGreensM2,
            teeM2: fa.golfTeeM2,
            fairwayM2: fa.golfFairwayM2,
        });
        return {normal: result, altWasserM3: fa.altWasserM3, areaHa: field.areaHa};
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
        return {normal: result, altWasserM3: fa.altWasserM3, areaHa: field.areaHa};
    }

    if (
        fa.module === "tennen" &&
        field.climateDataStatus === "done" &&
        field.climateData
    ) {
        const annualPrecipMm = field.climateData.precipitation
            .reduce((sum: number, v: number | null) => sum + (v ?? 0), 0);
        const result = calculateTennen({annualPrecipMm, areaHa: field.areaHa});
        return {normal: result, altWasserM3: fa.altWasserM3, areaHa: field.areaHa};
    }

    return null;
  } catch (e) {
    console.error("getAssignmentResult failed for field", field?.name, e);
    return null;
  }
};

// Summiert m³/a-Ranges über alle Assignments (mm/a wird vom Aufrufer aus Volumen ÷ Fläche abgeleitet)
export const sumResults = (results: AssignmentResult[]): {
    normalM3: [number, number] | null;
    normalAreaHa: number;
    dryM3: [number, number] | null;
    dryAreaHa: number;
    totalAltWasserM3: number;
    nettoM3: [number, number] | null;
} => {
    let normalM3Min = 0, normalM3Max = 0, normalAreaHa = 0, hasNormal = false;
    let dryM3Min = 0, dryM3Max = 0, dryAreaHa = 0, hasDry = false;
    let totalAltWasserM3 = 0;

    results.forEach((r) => {
        const normalHasValue = r.normal && (!('hasValue' in r.normal) || r.normal.hasValue);
        const dryHasValue = r.dry && (!('hasValue' in r.dry) || r.dry.hasValue);
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

    // Netto = Brutto-Normal minus alternative Wasserquellen (nie negativ)
    const nettoM3: [number, number] | null = hasNormal
        ? [Math.max(0, normalM3Min - totalAltWasserM3), Math.max(0, normalM3Max - totalAltWasserM3)]
        : null;

    return {
        normalM3: hasNormal ? [normalM3Min, normalM3Max] : null,
        normalAreaHa,
        dryM3: hasDry ? [dryM3Min, dryM3Max] : null,
        dryAreaHa,
        totalAltWasserM3,
        nettoM3,
    };
};

export const getMissingData = (
    fa: FieldAssignment,
    field: Field
): string[] => {
    const missing: string[] = [];

    if (!fa.module) {
        missing.push("Nutzungsmodul");
        return missing; // Rest ergibt keinen Sinn ohne Modul
    }

    if ((fa.module === "hauptkulturen" || fa.module === "gemuese_obst") && !fa.plantKey) {
        missing.push("Kultur");
    }

    if (fa.module === "gemuese_obst" && !fa.irrigationPeriod) {
        missing.push("Bewässerungszeitraum");
    }

    // Automatisch ermittelbare Werte (Klimazone, Klimadaten, nFKWe) werden NICHT
    // als Fehler gemeldet wenn sie nur noch nicht geladen sind — sie heilen sich
    // selbst, sobald die WASM-/Raster-Lookups bereit sind. Nur echte Fehler melden.
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

    // Alt. Wasserquellen-Pflichtangabe (0 = "keine vorhanden", undefined = nicht beantwortet)
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