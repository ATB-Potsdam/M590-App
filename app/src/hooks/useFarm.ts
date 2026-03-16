// src/hooks/useFarm.ts
import {v4 as uuidv4} from "uuid";
import {latLonToClimateClass} from "../lib/tools";
import {useAppStore} from "../stores/useAppStore";
import {useLocalStore} from "../stores/useLocalStore";
import type {Farm, Field, FieldInput} from "../types/farm";
import type {RasterLookup} from "../types/raster";

export const useFarm = () => {
    const [farm, setFarm] = useLocalStore((state) => state.dwa_farm);
    const precipitationLookup = useAppStore((state) => state.precipitationLookup);
    const et0Lookup = useAppStore((state) => state.et0Lookup);

    // Klimadaten für ein Feld laden und speichern
    const fetchClimateData = (id: string, lat: number, lon: number) => {
        if (!precipitationLookup || !et0Lookup) return;

        setFarm((prev: Farm) => ({
            ...prev,
            fields: prev.fields.map((f) =>
                f.id === id ? {...f, climateDataStatus: "loading" as const} : f
            ),
        }));

        try {
            const precipitation = precipitationLookup.getValues(lon, lat);
            const et0 = et0Lookup.getValues(lon, lat);

            setFarm((prev: Farm) => ({
                ...prev,
                fields: prev.fields.map((f) =>
                    f.id === id
                        ? {...f, climateData: {precipitation, et0}, climateDataStatus: "done" as const}
                        : f
                ),
            }));
        } catch (e) {
            console.error("Klimadaten konnten nicht geladen werden:", e);
            setFarm((prev: Farm) => ({
                ...prev,
                fields: prev.fields.map((f) =>
                    f.id === id ? {...f, climateDataStatus: "error" as const} : f
                ),
            }));
        }
    };

    const addField = (
        field: FieldInput
    ) => {
        const id = uuidv4();

        // Sofort mit loading speichern
        setFarm((prev: Farm) => ({
            ...prev,
            fields: [
                ...prev.fields,
                {
                    ...field,
                    id,
                    climateClassStatus: "loading" as const,
                    climateDataStatus: precipitationLookup && et0Lookup ? "loading" as const : "idle" as const,
                },
            ],
            updatedAt: new Date().toISOString(),
        }));

        // Klimazone + Klimadaten parallel ermitteln
        latLonToClimateClass(field.location)
            .then((climateClass) => {
                setFarm((prev: Farm) => ({
                    ...prev,
                    fields: prev.fields.map((f) =>
                        f.id === id ? {...f, climateClass, climateClassStatus: "done" as const} : f
                    ),
                    updatedAt: new Date().toISOString(),
                }));
            })
            .catch((e) => {
                console.error("Klimazone konnte nicht ermittelt werden:", e);
                setFarm((prev: Farm) => ({
                    ...prev,
                    fields: prev.fields.map((f) =>
                        f.id === id ? {...f, climateClassStatus: "error" as const} : f
                    ),
                    updatedAt: new Date().toISOString(),
                }));
            });

        // Klimadaten synchron aus Raster (getValue ist synchron)
        fetchClimateData(id, field.location.lat, field.location.lon);
    };

    const editField = (
        id: string,
        data: FieldInput
    ) => {
        setFarm((prev: Farm) => ({
            ...prev,
            fields: prev.fields.map((f) =>
                f.id === id
                    ? {
                        ...f,
                        ...data,
                        climateClass: undefined,
                        climateClassStatus: "loading" as const,
                        climateData: undefined,
                        climateDataStatus: precipitationLookup && et0Lookup ? "loading" as const : "idle" as const,
                    }
                    : f
            ),
            updatedAt: new Date().toISOString(),
        }));

        latLonToClimateClass(data.location)
            .then((climateClass) => {
                setFarm((prev: Farm) => ({
                    ...prev,
                    fields: prev.fields.map((f) =>
                        f.id === id ? {...f, climateClass, climateClassStatus: "done" as const} : f
                    ),
                    updatedAt: new Date().toISOString(),
                }));
            })
            .catch((e) => {
                console.error("Klimazone konnte nicht ermittelt werden:", e);
                setFarm((prev: Farm) => ({
                    ...prev,
                    fields: prev.fields.map((f) =>
                        f.id === id ? {...f, climateClassStatus: "error" as const} : f
                    ),
                    updatedAt: new Date().toISOString(),
                }));
            });

        fetchClimateData(id, data.location.lat, data.location.lon);
    };

    const removeField = (id: string) => {
        setFarm((prev: Farm) => ({
            ...prev,
            fields: prev.fields.filter((f) => f.id !== id),
            updatedAt: new Date().toISOString(),
        }));
    };

    const updateFarmName = (name: string) => {
        setFarm((prev: Farm) => ({...prev, name, updatedAt: new Date().toISOString()}));
    };

    return {farm, updateFarmName, addField, editField, removeField};
};

export const refreshClimateData = (
    precipitationLookup: RasterLookup,
    et0Lookup: RasterLookup,
    setFarm: (fn: (prev: Farm) => Farm) => void,
    fields: Field[]
) => {
    fields
        .filter((f) => f.climateDataStatus !== "done")
        .forEach((f) => {
            try {
                const precipitation = precipitationLookup.getValues(f.location.lon, f.location.lat);
                const et0 = et0Lookup.getValues(f.location.lon, f.location.lat);
                setFarm((prev: Farm) => ({
                    ...prev,
                    fields: prev.fields.map((pf) =>
                        pf.id === f.id
                            ? {...pf, climateData: {precipitation, et0}, climateDataStatus: "done" as const}
                            : pf
                    ),
                }));
            } catch (e) {
                console.error(`Klimadaten für Feld ${f.name} fehlgeschlagen:`, e);
                setFarm((prev: Farm) => ({
                    ...prev,
                    fields: prev.fields.map((pf) =>
                        pf.id === f.id ? {...pf, climateDataStatus: "error" as const} : pf
                    ),
                }));
            }
        });
};
