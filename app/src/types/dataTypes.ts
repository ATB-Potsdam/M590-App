import type {agriculturalPlantNames, cropNames, fordderPlantNames, fruitNames, medicalPlantNames, vegetableNames} from "../constants/plantNames";

export type Range = [min: number, max: number];


export const nFkweClassNames = ["1-2", "3a", "3b", "4", "5"] as const;
export const kwbvZoneNames = ["A", "B", "C", "D", "E", "F", "G", "H"] as const;

export type YearType = "normal" | "dry";

export type KwbType = [number, number, number, number, number, number, number, number, number, number, number, number,];

export type NFkweClassName = typeof nFkweClassNames[number];
export type KwbZone = typeof kwbvZoneNames[number];
export type CropName = typeof cropNames[number];
export type VegetableName = typeof vegetableNames[number];
export type FruitName = typeof fruitNames[number];
export type MedicalPlantName = typeof medicalPlantNames[number];
export type AgriculturalPlantName = typeof agriculturalPlantNames[number];
export type FordderPlantName = typeof fordderPlantNames[number];

export type RawData = [norm: [Range | null, Range | null, Range | null, Range | null], dry: [Range | null, Range | null, Range | null, Range | null], time: Range];

export type AnyPlantName = VegetableName | FruitName | MedicalPlantName | AgriculturalPlantName | FordderPlantName;
// export type AnyPlantName = FruitName | MedicalPlantName | AgriculturalPlantName | FordderPlantName;