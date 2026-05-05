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
    /**
     * Benutzerdefinierte Zusatzbewässerung (mm/a) für Kulturen ohne Literaturwert.
     * Ersetzt fehlende Tabellenwerte durch Anwender-geschätzten Bedarf.
     * Nur wirksam wenn Tabellenwert null (hasValue=false).
     */
    userCustomMm?: number;
    isJunganlage?: boolean;
    // Grünflächen FLL factors
    fllVegetation?: "rasen" | "stauden" | "baeume";
    fllMoisture?: "trocken" | "frisch" | "feucht";
    fllSoil?: "sand" | "sandiger_lehm" | "lehm";
    fllSun?: "schatten" | "halbschatten" | "sonne";
    fllPeriodStart?: number; // month 1-12
    fllPeriodEnd?: number;   // month 1-12
    // Golf sub-areas
    golfAreaMode?: "manual" | "18hole" | "spielbahn";
    golfGreensM2?: number;
    golfTeeM2?: number;
    golfFairwayM2?: number;
    // Kunstrasen
    kunstrasenWeeks?: number;
    kunstrasenMmPerWeek?: number;
    // Alternative Wasserquellen (Grünflächen + Sportflächen)
    altWasserM3?: number;
}

export interface Project {
    id: string;
    name: string;
    description?: string;
    fieldAssignments: FieldAssignment[];
    createdAt: string;
    updatedAt: string;
}
