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
    /** Value for a month (calendar month 1–12) at a coordinate */
    getValue: (lon: number, lat: number, month: number) => number | null;
    /** Values for all months (calendar month 1–12) at a coordinate */
    getValues: (lon: number, lat: number) => MonthValueType;
    /** Raw metadata */
    meta: () => RasterMeta | null;
}