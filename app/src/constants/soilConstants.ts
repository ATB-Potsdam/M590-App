import {nFkweClassNames, type AnyPlantName, type CropName, type KwbType, type KwbZone, type NFkweClassName, type Range, type RawData} from "../types/dataTypes";
import {rawAgriculturalPlants, rawCropDataDry, rawCropDataNorm, rawFodderPlants, rawFruitData, rawMedicalPlantData, rawVegetableData} from "./plantDataRaw";
type KfeClass = [
    nKfeRange: Range,
    soilRange: Range,
    mmkTypes: string[],
];


export type CropAdditionalWater = Record<KwbZone, Record<CropName, Record<NFkweClassName, Range>>>;

export const nFkweClasses: Record<NFkweClassName, KfeClass> = {
    "1-2": [[0, 90], [0, 30], ["D1a", "D2a", "D2b", "D3a", "D3c", "V3a", "V3c", "V5c", "V7c", "Al3c", "K1a"]],
    "3a": [[90, 115], [30, 40], ["D3b", "D4a", "D4b", "D4c", "V2a", "V2c", "V3b", "V4a", "V4c", "V5c"]],
    "3b": [[115, 140], [40, 50], ["D5a", "D5b", "D5c", "D6a", "V5a", "V5b", "V6b", "V7a", "V7b", "V8a/9b", "Al1c/2c", "Al3a", "Al3b", "Lö2c", "Lö3a, t", "Lö4c", "Lö5b, t", "Lö5c", "Lö6b, t", "K1b, t", "K1c, t"]],
    "4": [[140, 200], [50, 70], ["D6b", "D6c", "V1a", "Al1a/2a", "Al1b/2b", "Lö1a", "Lö1b, t", "Lö1c, t", "Lö2d, t", "Lö3c, t", "Lö4b, t", "Lö5b, l", "Lö6c, t", "K1b, l"]],
    "5": [[200, Infinity], [70, Infinity], ["Lö1a, l", "Lö1b, l", "Lö1c, l", "Lö2d, l", "Lö3a, l", "Lö3c, l", "Lö4b, l", "Lö6b, l", "Lö6c, l"]],
} as const;

export const kwbWater: Record<KwbZone, Range> = {
    "A": [50, Infinity],
    "B": [0, 50],
    "C": [-50, 0],
    "D": [-100, -50],
    "E": [-150, -100],
    "F": [-200, -150],
    "G": [-250, -200],
    "H": [-Infinity, -250],
} as const;

export const refKwb: KwbType = [0, 0, -1, -48, -52, -58, -48, -49, -15, 13, 0, 0];

export const rFactor: Record<NFkweClassName, number> = {
    "1-2": 0.7,
    "3a": 0.8,
    "3b": 0.8,
    "4": 0.9,
    "5": 1,
};



const parseRawCropDataTable = (rawData: Record<KwbZone, Record<CropName, number[]>>): CropAdditionalWater =>
    Object.fromEntries(
        Object.entries(rawData).map(([cropName, cropData]) => [
            cropName,
            Object.fromEntries(
                Object.entries(cropData)
                    .map(([cropName, starts]) => [
                        cropName,
                        Object.fromEntries(
                            nFkweClassNames.map((name, i) => [name, [starts[i + 1] || 0, starts[i] || 0] as Range])
                        )
                    ])
            )
        ])
    ) as CropAdditionalWater;

export const additionWaterNormYear: CropAdditionalWater = parseRawCropDataTable(rawCropDataNorm);
export const additionWaterDryYear: CropAdditionalWater = parseRawCropDataTable(rawCropDataDry);

export const allOtherPlants: Record<AnyPlantName, RawData> = {
    ...rawVegetableData,
    ...rawFruitData,
    ...rawMedicalPlantData,
    ...rawAgriculturalPlants,
    ...rawFodderPlants,
}; 