// src/constants/plantCategories.ts
import type {PlantCategory} from "../types/project";
import {
    agriculturalPlantNames,
    fodderPlantNames,
    fruitNames,
    medicalPlantNames,
    vegetableNames
} from "./plantNames";

export interface PlantCategoryDefinition {
    type: PlantCategory;
    icon: string;
    label: string;
    /** What belongs in this category — shown under the category button. */
    description: string;
    names: readonly string[];
}

export const PLANT_CATEGORIES: PlantCategoryDefinition[] = [
    // {type: "hauptkulturen", icon: "🌾", label: "Hauptkulturen", names: cropNames},
    {
        type: "gemuese", icon: "🥦", label: "Gemüse", names: vegetableNames,
        description: "Feldgemüse und Gemüsesätze, z. B. Kohl, Salat, Möhre, Zwiebel, Spargel",
    },
    {
        type: "obst", icon: "🍎", label: "Obst", names: fruitNames,
        description: "Kern-, Stein- und Beerenobst sowie Erdbeeren",
    },
    {
        type: "medizinal", icon: "🌿", label: "Medizinalpflanzen", names: medicalPlantNames,
        description: "Arznei- und Gewürzpflanzen, z. B. Kamille, Pfefferminze, Baldrian, Thymian",
    },
    {
        type: "agrar", icon: "🌱", label: "Agrarpflanzen", names: agriculturalPlantNames,
        description: "Ackerkulturen außerhalb der Hauptkulturen, z. B. Ackerbohne, Soja, Lupine, "
            + "Mohn, Hopfen, Tabak, Wiese/Weide",
    },
    {
        type: "futter", icon: "🌾", label: "Futterpflanzen", names: fodderPlantNames,
        description: "Futtergräser und -leguminosen zur Samennutzung, z. B. Weidelgras, "
            + "Rotklee, Knaulgras",
    },
];

export const getPlantCategory = (type: PlantCategory): PlantCategoryDefinition =>
    PLANT_CATEGORIES.find((c) => c.type === type)!;

export const getPlantCategoryLabel = (type: PlantCategory): string =>
    getPlantCategory(type).label;
