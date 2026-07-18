// src/lib/demoData.ts
import {v4 as uuidv4} from "uuid";
import type {Farm, Field} from "../types/farm";
import type {FieldAssignment, Project} from "../types/project";
import type {RasterLookup} from "../types/raster";
import {latLonToClimateClass} from "./tools";

// Beispieldaten zum Kennenlernen der App. Bewusst in der Region Brandenburg
// (Potsdam-Referenz, siehe soilConstants) verortet, damit Klima- und Bodenwerte
// automatisch nachgeladen werden. Der Anwender kann Betrieb/Szenario jederzeit
// löschen — es sind normale Datensätze ohne Sonderbehandlung.

const now = () => new Date().toISOString();

const demoField = (name: string, lat: number, lon: number, areaHa: number): Field => ({
    id: uuidv4(),
    name,
    location: {lat, lon},
    areaHa,
    // Bodenklasse fest gesetzt, damit die Demo ohne Karten-Lookup rechnet;
    // Klimazone + Klimadaten werden nach dem Laden selbstheilend ergänzt.
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
 * Erzeugt einen Beispiel-Betrieb mit zwei Feldern und ein Beispiel-Szenario mit
 * je einer landwirtschaftlichen und einer Golf-Zuweisung — damit Anwender das
 * Ergebnis (inkl. PDF) sofort sehen, bevor sie eigene Daten erfassen.
 */
export const createDemoData = (): {farm: Farm; project: Project} => {
    const acker = demoField("Beispiel-Acker (Kartoffeln)", 52.4009, 13.0591, 12.5);
    const golf = demoField("Beispiel-Golfplatz", 52.3906, 13.0645, 45);

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
 * Seedet Demo-Betrieb + Demo-Szenario in den Store und ergänzt Klimazone/-daten
 * direkt (die App-Effekte feuern nach dem Seeden nicht erneut). Gibt die Projekt-ID
 * für die anschließende Navigation zurück. Ersetzt Betrieb UND Szenarien komplett
 * durch die Demo — mehrfaches Laden erzeugt daher keine Duplikate.
 */
export const seedDemoData = (
    setFarm: (farm: Farm) => void,
    setProjects: (projects: Project[]) => void,
    precipitationLookup: RasterLookup | null | undefined,
    et0Lookup: RasterLookup | null | undefined,
): string => {
    const {farm, project} = createDemoData();

    // Klimazone + Klimadaten anreichern, damit die Demo sofort rechnet.
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
