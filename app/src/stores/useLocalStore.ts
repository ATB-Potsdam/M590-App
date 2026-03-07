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

const loadFromStorage = <K extends keyof LocalStorageTypes>(
    key: K,
): LocalStorageTypes[K] => {
    try {
        const item = localStorage.getItem(key);
        return item ? (JSON.parse(item) as LocalStorageTypes[K]) : defaultValues[key];
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
