// src/lib/demoData.ts
import {v4 as uuidv4} from "uuid";
import type {Farm, Field} from "../types/farm";
import type {FieldAssignment, Project} from "../types/project";
import type {RasterLookup} from "../types/raster";
import {latLonToClimateClass} from "./tools";

// Demo data for getting to know the app. Uses real sites near the ATB in the
// Brandenburg region (Potsdam reference, see soilConstants) so that climate and
// soil values are loaded automatically. The user can delete the farm/scenario at any time —
// these are normal records without special handling.

const now = () => new Date().toISOString();

const demoField = (name: string, lat: number, lon: number, areaHa: number): Field => ({
    id: uuidv4(),
    name,
    location: {lat, lon},
    areaHa,
    // Soil class fixed so the demo computes without a map lookup;
    // climate zone + climate data are filled in self-healingly after loading.
    nFkweClass: "3a",
    nFkweClassSource: "manual",
    climateClassStatus: "idle",
    climateDataStatus: "idle",
});

const baseAssignment = (fieldId: string): FieldAssignment => ({
    id: uuidv4(),
    fieldId,
    surchargeIntermediate: false,
    surchargeEmergence: 0,
    surchargeHeavySoil: 0,
});

/**
 * Creates a demo farm with two fields and a demo scenario with one
 * agricultural and one golf assignment each — so users see the
 * result (incl. PDF) immediately before entering their own data.
 */
export const createDemoData = (): {farm: Farm; project: Project} => {
    // Real sites near the ATB (Potsdam-Bornim) so climate/soil lookups load
    // automatically and users recognise the locations:
    //  - ATB "Fieldlab" research farmland at Marquardt (NW of the institute).
    //  - Märkischer Golfclub Potsdam, Kemnitz (real 18-hole course).
    const acker = demoField("Beispiel-Acker (Kartoffeln) – ATB Marquardt", 52.4578, 12.9669, 12.5);
    const golf = demoField("Beispiel-Golfplatz – Golfclub Kemnitz", 52.4093, 12.8741, 45);

    const farm: Farm = {
        id: uuidv4(),
        name: "Beispielbetrieb (Demo)",
        fields: [acker, golf],
        createdAt: now(),
        updatedAt: now(),
    };

    const ackerAssignment: FieldAssignment = {
        ...baseAssignment(acker.id),
        module: "hauptkulturen",
        plantCategory: "hauptkulturen",
        plantKey: "Kartoffeln",
        isTablePotato: true,
    };

    const golfAssignment: FieldAssignment = {
        ...baseAssignment(golf.id),
        module: "golf",
        golfAreaMode: "18hole",
        golfGreensM2: 18_000,
        golfTeeM2: 11_700,
        golfFairwayM2: 176_000,
        altWasserM3: 0,
    };

    const project: Project = {
        id: uuidv4(),
        name: "Beispiel-Szenario",
        description: "Automatisch erzeugtes Demo-Szenario – jederzeit löschbar.",
        fieldAssignments: [ackerAssignment, golfAssignment],
        createdAt: now(),
        updatedAt: now(),
        isDemo: true,
    };

    return {farm, project};
};

/**
 * Seeds the demo farm + demo scenario into the store and fills in the climate
 * zone/data directly (the app effects do not re-fire after seeding). Returns the
 * project ID for the subsequent navigation. Replaces the farm AND scenarios
 * entirely with the demo — so loading multiple times produces no duplicates.
 */
export const seedDemoData = (
    setFarm: (farm: Farm) => void,
    setProjects: (projects: Project[]) => void,
    precipitationLookup: RasterLookup | null | undefined,
    et0Lookup: RasterLookup | null | undefined,
): string => {
    const {farm, project} = createDemoData();

    // Enrich with climate zone + climate data so the demo computes immediately.
    const enrichField = (f: Field): Field => {
        const withClass: Field = (() => {
            try {
                return {...f, climateClass: latLonToClimateClass(f.location), climateClassStatus: "done"};
            } catch {
                return {...f, climateClassStatus: "error"};
            }
        })();
        if (!precipitationLookup || !et0Lookup) return withClass;
        try {
            return {
                ...withClass,
                climateData: {
                    precipitation: precipitationLookup.getValues(f.location.lon, f.location.lat),
                    et0: et0Lookup.getValues(f.location.lon, f.location.lat),
                },
                climateDataStatus: "done",
            };
        } catch {
            return {...withClass, climateDataStatus: "error"};
        }
    };
    const enrichedFields = farm.fields.map(enrichField);

    setFarm({...farm, fields: enrichedFields});
    setProjects([project]);
    return project.id;
};
