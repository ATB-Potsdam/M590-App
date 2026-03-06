// src/hooks/useLocalStorage.ts
import {v4 as uuidv4} from "uuid";
import {create} from "zustand";
import {subscribeWithSelector} from "zustand/middleware";
import type {Farm} from "../types/farm";
import type {ValueSetter} from "../types/types";



interface LocalStorageTypes {
    dwa_farm: Farm;
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
    }
} as const;

export const loadFromStorage = <K extends keyof LocalStorageTypes>(
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
    subscribeWithSelector((set, get) => {
        const createStub = <K extends keyof LocalStorageTypes>(key: K): ValueSetter<LocalStorageTypes[K]> => {
            return [
                loadFromStorage(key),
                (value: LocalStorageTypes[K] | ((prev: LocalStorageTypes[K]) => LocalStorageTypes[K])) => {
                    const previous: LocalStoreState[K] = get()[key];
                    const nextValue: LocalStorageTypes[K] = value instanceof Function ? value(previous[0]) : value;
                    const next: LocalStoreState[K] = [nextValue, previous[1]]
                    try {
                        localStorage.setItem(key, JSON.stringify(nextValue));
                    } catch (e) {
                        console.error(e);
                    }
                    set({[key]: next});
                }
            ];
        };
        return ({
            dwa_farm: createStub("dwa_farm"),
        });
    })
);
