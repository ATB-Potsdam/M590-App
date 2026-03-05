// src/types/farm.ts

import type {ClimateClassType} from "../types";

export interface GeoPoint {
    lat: number;
    lon: number;
}

export interface Field {
    id: string;
    name: string;
    location: GeoPoint;
    areaHa: number;
    climateClass?: ClimateClassType;      // optional: wird nach dem Speichern befüllt
    climateClassStatus: "idle" | "loading" | "error" | "done";
}

export interface Farm {
    id: string;
    name: string;
    fields: Field[];
    createdAt: string;
    updatedAt: string;
}
