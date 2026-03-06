// src/hooks/useFarm.ts
import {v4 as uuidv4} from "uuid";
import {latLonToClimateClass} from "../lib/tools";
import {useLocalStore} from "../stores/useLocalStore";
import {type Farm, type Field} from "../types/farm";

export const useFarm = () => {
    const [farm, setFarm] = useLocalStore(state => state.dwa_farm);

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
