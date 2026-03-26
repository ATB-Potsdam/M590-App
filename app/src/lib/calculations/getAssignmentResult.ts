// src/lib/calculations/getAssignmentResult.ts
import type {AnyPlantName, CropName, KwbZone, NFkweClassName} from "../../types/dataTypes";
import type {Field} from "../../types/farm";
import type {FieldAssignment} from "../../types/project";
import {calculateGemueseObstBoth, type GemueseObstResult} from "./gemueseObst";
import type {HauptkulturenResult} from "./hauptkulturen";
import {calculateHauptkulturenBoth} from "./hauptkulturen";
import {calculateWeinbauBoth, type WeinbauResult} from "./weinbau";

export interface AssignmentResult {
    normal?: HauptkulturenResult | GemueseObstResult | WeinbauResult;
    dry?: HauptkulturenResult | GemueseObstResult | WeinbauResult;
}

export const getAssignmentResult = (
    fa: FieldAssignment,
    field: Field,
): AssignmentResult | null => {
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
        };

        const {normal, dry} = calculateHauptkulturenBoth(input);
        return {normal, dry};
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
            surchargeIntermediate: fa.surchargeIntermediate,
            surchargeEmergence: fa.surchargeEmergence,
        };

        const {normal, dry} = calculateGemueseObstBoth(input);
        return {normal, dry};
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
        return {normal, dry};
    }

    return null;
};

// Summiert m³/a-Ranges über alle Assignments
export const sumResults = (results: AssignmentResult[]): {
    normalM3: [number, number] | null;
    dryM3: [number, number] | null;
} => {
    let normalMin = 0, normalMax = 0, hasNormal = false;
    let dryMin = 0, dryMax = 0, hasDry = false;

    results.forEach((r) => {
        if (r.normal) {
            normalMin += r.normal.totalRangeM3[0];
            normalMax += r.normal.totalRangeM3[1];
            hasNormal = true;
        }
        if (r.dry) {
            dryMin += r.dry.totalRangeM3[0];
            dryMax += r.dry.totalRangeM3[1];
            hasDry = true;
        }
    });

    return {
        normalM3: hasNormal ? [normalMin, normalMax] : null,
        dryM3: hasDry ? [dryMin, dryMax] : null,
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

    if (field.climateClassStatus !== "done") {
        missing.push("Klimazone");
    }

    if (field.climateDataStatus !== "done") {
        missing.push("Klimadaten");
    }

    if (!field.nFkweClass &&
        (fa.module === "hauptkulturen" || fa.module === "gemuese_obst" || fa.module === "weinbau")) {
        missing.push("nFKWe-Klasse");
    }

    return missing;
};