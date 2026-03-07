// src/constants/plantCategories.ts
import type {PlantCategory} from "../types/project";
import {
    agriculturalPlantNames,
    cropNames,
    fodderPlantNames,
    fruitNames,
    medicalPlantNames,
    vegetableNames,
} from "./plantNames";

export interface PlantCategoryDefinition {
    type: PlantCategory;
    icon: string;
    label: string;
    names: readonly string[];
}

export const PLANT_CATEGORIES: PlantCategoryDefinition[] = [
    {type: "hauptkulturen", icon: "🌾", label: "Hauptkulturen", names: cropNames},
    {type: "gemuese", icon: "🥦", label: "Gemüse", names: vegetableNames},
    {type: "obst", icon: "🍎", label: "Obst", names: fruitNames},
    {type: "medizinal", icon: "🌿", label: "Medizinalpflanzen", names: medicalPlantNames},
    {type: "agrar", icon: "🌱", label: "Agrarpflanzen", names: agriculturalPlantNames},
    {type: "futter", icon: "🌾", label: "Futterpflanzen", names: fodderPlantNames},
];

export const getPlantCategory = (type: PlantCategory): PlantCategoryDefinition =>
    PLANT_CATEGORIES.find((c) => c.type === type)!;

export const getPlantCategoryLabel = (type: PlantCategory): string =>
    getPlantCategory(type).label;
