// src/types/project.ts
export type ModuleType =
    | "hauptkulturen"
    | "gemuese_obst"
    | "weinbau"
    | "gruenflaechen"
    | "naturrasen"
    | "golf"
    | "kunstrasen"
    | "tennen";

export type PlantCategory =
    | "hauptkulturen"
    | "gemuese"
    | "obst"
    | "medizinal"
    | "agrar"
    | "futter";

export type IrrigationMonth = 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10; // März–Oktober

export type MonthPosition = "early" | "mid" | "late" | "full";

export interface IrrigationBound {
    month: IrrigationMonth;
    position: MonthPosition;
}

export interface IrrigationPeriod {
    from: IrrigationBound;
    to: IrrigationBound;
}

export interface FieldAssignment {
    id: string;
    fieldId: string;
    module?: ModuleType;
    plantCategory?: PlantCategory;
    plantKey?: string;
    irrigationPeriod?: IrrigationPeriod;
    surchargeIntermediate: boolean;
    surchargeEmergence: number;
    surchargeHeavySoil: number;
}

export interface Project {
    id: string;
    name: string;
    year?: number;
    fieldAssignments: FieldAssignment[];
    createdAt: string;
    updatedAt: string;
}
