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
    /**
     * Which raster generation `climateData` was read from (see
     * CLIMATE_DATA_VERSION). Fields stamped with an older value are re-read on
     * load — without this a user who already has fields keeps the numbers from
     * whichever rasters were current when the field was created, and a corrected
     * data basis never reaches them.
     */
    climateDataVersion?: number;
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

export type FieldInput = Omit<Field, "id" | "climateClass" | "climateClassStatus" | "climateData" | "climateDataStatus" | "climateDataVersion">;