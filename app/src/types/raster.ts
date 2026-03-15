import type {MonthValueType} from "./dataTypes";

export interface RasterMeta {
    type: string;
    description: string;
    unit: string;
    period: string;
    months: number[];
    nrows: number;
    ncols: number;
    xcenter_ll: number;
    ycenter_ll: number;
    cellsize: number;
    crs: string;
    nodata: number;
}

export interface RasterLookup {
    /** Wert für Monat (Kalendermonat 1–12) an Koordinate */
    getValue: (lon: number, lat: number, month: number) => number | null;
    /** Wert für alle Monate (Kalendermonat 1–12) an Koordinate */
    getValues: (lon: number, lat: number) => MonthValueType;
    /** Rohe Metadaten */
    meta: () => RasterMeta | null;
}