// src/lib/calculations/golf.ts
// DWA-M 590, Kap. 4.4.4, Tables 34 and 35: golf courses
import type {Range} from "../../types/dataTypes";
import {toNaturrasenPrecipClass, type NaturrasenPrecipClass} from "./naturrasen";

// Table 34: mean annual additional water demand for golf courses (mm/a)
const TABLE_34_GREENS: Record<NaturrasenPrecipClass, Range> = {
    "<500":    [400, 600],
    "500-700": [300, 400],
    "700-900": [200, 300],
    ">900":    [100, 200],
};

const TABLE_34_TEES: Record<NaturrasenPrecipClass, Range> = {
    "<500":    [250, 400],
    "500-700": [200, 250],
    "700-900": [100, 200],
    ">900":    [50,  100],
};

const TABLE_34_FAIRWAYS: Record<NaturrasenPrecipClass, Range> = {
    "<500":    [200, 300],
    "500-700": [150, 200],
    "700-900": [100, 150],
    ">900":    [0,   100],
};

// Table 35: mean area sizes of the various sub-areas (m²)
export const TABLE_35 = {
    "18hole":    {greensM2: 18_000, teeM2: 11_700, fairwayM2: 176_000},
    "spielbahn": {greensM2: 1_000,  teeM2: 650,    fairwayM2: 9_778},
} as const;

export type GolfAreaMode = "manual" | "18hole" | "spielbahn";

export interface GolfInput {
    annualPrecipMm: number;
    greensM2: number;
    teeM2: number;
    fairwayM2: number;
}

/** m³/a for a single sub-area: mm/a × m² / 1000 */
const toM3Range = ([min, max]: Range, areaM2: number): Range =>
    [min * areaM2 / 1000, max * areaM2 / 1000];

export interface GolfSubAreaResult {
    /** Table 34 range in mm/a */
    rangeMmPerA: Range;
    /** Converted to m³/a for the given area */
    rangeM3: Range;
    /** Area in m² */
    areaM2: number;
}

export interface GolfResult {
    precipClass: NaturrasenPrecipClass;
    annualPrecipMm: number;
    greens: GolfSubAreaResult;
    tees: GolfSubAreaResult;
    fairways: GolfSubAreaResult;
    /** Sum of all sub-area m³/a */
    totalRangeM3: Range;
    /** Sum of all sub-area mm/a (area-weighted average) */
    totalRangeMm: Range;
}

export const calculateGolf = ({annualPrecipMm, greensM2, teeM2, fairwayM2}: GolfInput): GolfResult => {
    const precipClass = toNaturrasenPrecipClass(annualPrecipMm);

    const greensMmRange = TABLE_34_GREENS[precipClass];
    const teesMmRange   = TABLE_34_TEES[precipClass];
    const fairwayMmRange = TABLE_34_FAIRWAYS[precipClass];

    const greens:   GolfSubAreaResult = {rangeMmPerA: greensMmRange,  rangeM3: toM3Range(greensMmRange,  greensM2),  areaM2: greensM2};
    const tees:     GolfSubAreaResult = {rangeMmPerA: teesMmRange,    rangeM3: toM3Range(teesMmRange,    teeM2),     areaM2: teeM2};
    const fairways: GolfSubAreaResult = {rangeMmPerA: fairwayMmRange, rangeM3: toM3Range(fairwayMmRange, fairwayM2), areaM2: fairwayM2};

    const totalRangeM3: Range = [
        greens.rangeM3[0] + tees.rangeM3[0] + fairways.rangeM3[0],
        greens.rangeM3[1] + tees.rangeM3[1] + fairways.rangeM3[1],
    ];

    const totalAreaM2 = greensM2 + teeM2 + fairwayM2;
    const totalRangeMm: Range = totalAreaM2 > 0
        ? [totalRangeM3[0] / totalAreaM2 * 1000, totalRangeM3[1] / totalAreaM2 * 1000]
        : [0, 0];

    return {precipClass, annualPrecipMm, greens, tees, fairways, totalRangeM3, totalRangeMm};
};
