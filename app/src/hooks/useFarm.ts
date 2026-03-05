// src/hooks/useFarm.ts
import {v4 as uuidv4} from "uuid";
import {latLonToClimateClass} from "../lib/tools";
import {type Farm, type Field} from "../types/farm";
import {useLocalStorage} from "./useLocalStorage";

const STORAGE_KEY = "dwa_farm";

const defaultFarm: Farm = {
    id: uuidv4(),
    name: "",
    fields: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

export const useFarm = () => {
    const [farm, setFarm] = useLocalStorage<Farm>(STORAGE_KEY, defaultFarm);

    const updateFarmName = (name: string) => {
        setFarm((prev: Farm) => ({...prev, name, updatedAt: new Date().toISOString()}));
    };

    const addField = (field: Omit<Field, "id" | "climateClass" | "climateClassStatus">) => {
        const id = uuidv4();

        // 1. Feld sofort mit Status "loading" speichern
        setFarm((prev: Farm) => ({
            ...prev,
            fields: [...prev.fields, {...field, id, climateClassStatus: "loading" as const}],
            updatedAt: new Date().toISOString(),
        }));

        // 2. Klimazone via polylookup ermitteln
        latLonToClimateClass(field.location)
            .then((climateClass) => {
                setFarm((prev: Farm) => ({
                    ...prev,
                    fields: prev.fields.map((f) =>
                        f.id === id
                            ? {...f, climateClass, climateClassStatus: "done" as const}
                            : f
                    ),
                    updatedAt: new Date().toISOString(),
                }));
            })
            .catch((e) => {
                console.error("Klimazone konnte nicht ermittelt werden:", e);
                setFarm((prev: Farm) => ({
                    ...prev,
                    fields: prev.fields.map((f) =>
                        f.id === id
                            ? {...f, climateClassStatus: "error" as const}
                            : f
                    ),
                    updatedAt: new Date().toISOString(),
                }));
            });
    };

    const editField = (id: string, data: Omit<Field, "id" | "climateClass" | "climateClassStatus">) => {
        // 1. Sofort mit "loading" speichern
        setFarm((prev: Farm) => ({
            ...prev,
            fields: prev.fields.map((f) =>
                f.id === id
                    ? {...f, ...data, climateClass: undefined, climateClassStatus: "loading" as const}
                    : f
            ),
            updatedAt: new Date().toISOString(),
        }));

        // 2. Klimazone neu ermitteln
        latLonToClimateClass(data.location)
            .then((climateClass) => {
                setFarm((prev: Farm) => ({
                    ...prev,
                    fields: prev.fields.map((f) =>
                        f.id === id
                            ? {...f, climateClass, climateClassStatus: "done" as const}
                            : f
                    ),
                    updatedAt: new Date().toISOString(),
                }));
            })
            .catch((e) => {
                console.error("Klimazone konnte nicht ermittelt werden:", e);
                setFarm((prev: Farm) => ({
                    ...prev,
                    fields: prev.fields.map((f) =>
                        f.id === id
                            ? {...f, climateClassStatus: "error" as const}
                            : f
                    ),
                    updatedAt: new Date().toISOString(),
                }));
            });
    };

    const updateField = (id: string, data: Partial<Omit<Field, "id">>) => {
        setFarm((prev: Farm) => ({
            ...prev,
            fields: prev.fields.map((f) => (f.id === id ? {...f, ...data} : f)),
            updatedAt: new Date().toISOString(),
        }));
    };

    const removeField = (id: string) => {
        setFarm((prev: Farm) => ({
            ...prev,
            fields: prev.fields.filter((f) => f.id !== id),
            updatedAt: new Date().toISOString(),
        }));
    };

    return {farm, updateFarmName, addField, editField, updateField, removeField};
};
