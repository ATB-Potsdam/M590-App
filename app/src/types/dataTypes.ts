import type {agriculturalPlantNames, cropNames, fodderPlantNames, fruitNames, medicalPlantNames, vegetableNames} from "../constants/plantNames";

export type Range = [min: number, max: number];


export const nFkweClassNames = ["1-2", "3a", "3b", "4", "5"] as const;
export const kwbvZoneNames = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

export type YearType = "normal" | "dry";

export type MonthValueType = [
    jan: number | null,
    feb: number | null,
    mar: number | null,
    apr: number | null,
    may: number | null,
    jun: number | null,
    jul: number | null,
    aug: number | null,
    sep: number | null,
    oct: number | null,
    nov: number | null,
    dec: number | null,
];

export type NFkweClassName = typeof nFkweClassNames[number];
export type KwbZone = typeof kwbvZoneNames[number];
export type CropName = typeof cropNames[number];
export type VegetableName = typeof vegetableNames[number];
export type FruitName = typeof fruitNames[number];
export type MedicalPlantName = typeof medicalPlantNames[number];
export type AgriculturalPlantName = typeof agriculturalPlantNames[number];
export type FordderPlantName = typeof fodderPlantNames[number];

export type RawData = [norm: [Range | null, Range | null, Range | null, Range | null], dry: [Range | null, Range | null, Range | null, Range | null], time: Range];

export type AnyPlantName = VegetableName | FruitName | MedicalPlantName | AgriculturalPlantName | FordderPlantName;
// export type AnyPlantName = FruitName | MedicalPlantName | AgriculturalPlantName | FordderPlantName;