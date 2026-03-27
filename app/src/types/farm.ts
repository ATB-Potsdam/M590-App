// src/types/farm.ts
import type {ClimateClassType} from "../types";
import type {MonthValueType, NFkweClassName} from "./dataTypes";

export interface GeoPoint {
    lat: number;
    lon: number;
}

export interface FieldClimateData {
    precipitation: MonthValueType;   // mm/Monat, langjähriges Mittel
    et0: MonthValueType;             // mm/Monat, langjähriges Mittel
}

export interface Field {
    id: string;
    name: string;
    location: GeoPoint;
    areaHa: number;
    nFkweClass?: NFkweClassName;
    nFkweClassSource?: "geo" | "manual";
    climateClass?: ClimateClassType;
    climateClassStatus: "idle" | "loading" | "error" | "done";
    climateData?: FieldClimateData;
    climateDataStatus: "idle" | "loading" | "error" | "done";
}
export interface Farm {
    id: string;
    name: string;
    fields: Field[];
    createdAt: string;
    updatedAt: string;
}

export type FieldInput = Omit<Field, "id" | "climateClass" | "climateClassStatus" | "climateData" | "climateDataStatus">;