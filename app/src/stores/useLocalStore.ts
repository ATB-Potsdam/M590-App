// src/hooks/useLocalStorage.ts
import {v4 as uuidv4} from "uuid";
import {create} from "zustand";
import {subscribeWithSelector} from "zustand/middleware";
import type {Farm} from "../types/farm";
import type {Project} from "../types/project";
import type {ValueSetter} from "../types/types";



interface LocalStorageTypes {
    dwa_farm: Farm;
    dwa_projects: Project[];
}

type LocalStoreState = {
    [K in keyof LocalStorageTypes]: ValueSetter<LocalStorageTypes[K]>;
};

const defaultValues: {[K in keyof LocalStorageTypes]: LocalStorageTypes[K]} = {
    dwa_farm: {
        id: uuidv4(),
        name: "",
        fields: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    dwa_projects: []
} as const;

const VALID_NFKWE: string[] = ["1-2", "3a", "3b", "4", "5"];
const VALID_KWB_ZONES: string[] = ["A", "B", "C", "D", "E", "F", "G", "H"];
const VALID_MODULES: string[] = [
    "hauptkulturen", "gemuese_obst", "weinbau", "gruenflaechen",
    "naturrasen", "golf", "kunstrasen", "tennen",
];

/** Validate that climateClass is a proper [zone, kwb] tuple */
const isValidClimateClass = (v: unknown): boolean =>
    Array.isArray(v) && v.length === 2
    && typeof v[0] === "string" && VALID_KWB_ZONES.includes(v[0])
    && typeof v[1] === "number" && isFinite(v[1]);

/** Validate that climateData has proper 12-element arrays */
const isValidClimateData = (v: unknown): boolean => {
    if (!v || typeof v !== "object") return false;
    const d = v as Record<string, unknown>;
    return Array.isArray(d.precipitation) && d.precipitation.length === 12
        && Array.isArray(d.et0) && d.et0.length === 12;
};

// Sanitize loaded data against schema changes to prevent crashes on stale localStorage.
export const sanitize = <K extends keyof LocalStorageTypes>(key: K, data: unknown): LocalStorageTypes[K] => {
    if (key === "dwa_farm") {
        const d = data as Partial<Farm>;
        return {
            ...defaultValues.dwa_farm,
            ...d,
            fields: Array.isArray(d?.fields)
                ? d.fields.map((f) => {
                    // Validate nFkweClass
                    const nFkweClass = f.nFkweClass && VALID_NFKWE.includes(f.nFkweClass)
                        ? f.nFkweClass : undefined;
                    // Validate climateClass tuple structure
                    const climateClass = isValidClimateClass(f.climateClass)
                        ? f.climateClass : undefined;
                    // Validate climateData structure
                    const climateData = isValidClimateData(f.climateData)
                        ? f.climateData : undefined;

                    return {
                        ...f,
                        nFkweClass,
                        climateClass,
                        climateData,
                        areaHa: typeof f.areaHa === "number" && isFinite(f.areaHa) ? f.areaHa : 0,
                        // If status says "done" but the data is actually missing, reset to "idle"
                        // so the app re-fetches it rather than crashing on undefined access.
                        climateClassStatus: (f.climateClassStatus === "done" && !climateClass
                            ? "idle"
                            : (f.climateClassStatus ?? "idle")) as "idle" | "loading" | "error" | "done",
                        climateDataStatus: (f.climateDataStatus === "done" && !climateData
                            ? "idle"
                            : (f.climateDataStatus ?? "idle")) as "idle" | "loading" | "error" | "done",
                    };
                })
                : [],
        } as LocalStorageTypes[K];
    }
    if (key === "dwa_projects") {
        const arr = Array.isArray(data) ? data : [];
        return arr.map((p) => ({
            ...p,
            fieldAssignments: Array.isArray(p?.fieldAssignments)
                ? p.fieldAssignments.map((fa: Partial<Project["fieldAssignments"][number]>) => ({
                    surchargeIntermediate: false,
                    surchargeEmergence: 0,
                    surchargeHeavySoil: 0,
                    ...fa,
                    // Reset invalid module types from older versions
                    module: fa.module && VALID_MODULES.includes(fa.module) ? fa.module : undefined,
                }))
                : [],
        })) as LocalStorageTypes[K];
    }
    return data as LocalStorageTypes[K];
};

const loadFromStorage = <K extends keyof LocalStorageTypes>(
    key: K,
): LocalStorageTypes[K] => {
    try {
        const item = localStorage.getItem(key);
        if (!item) return defaultValues[key];
        return sanitize(key, JSON.parse(item));
    } catch {
        return defaultValues[key];
    }
};

export const useLocalStore = create<LocalStoreState>()(
    subscribeWithSelector((set) => {
        const createStub = <K extends keyof LocalStorageTypes>(key: K): ValueSetter<LocalStorageTypes[K]> => [
            loadFromStorage(key),
            value => set((state) => {
                const [previousValue, previousSetter] = state[key];
                const nextValue = value instanceof Function ? value(previousValue) : value;
                const next: ValueSetter<LocalStorageTypes[K]> = [nextValue, previousSetter];
                try {
                    localStorage.setItem(key, JSON.stringify(nextValue));
                } catch (e) {
                    console.error(e);
                }
                return {[key]: next};
            }),
        ];
        return ({
            dwa_farm: createStub("dwa_farm"),
            dwa_projects: createStub("dwa_projects"),
        });
    })
);
