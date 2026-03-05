// src/hooks/useLocalStorage.ts
import {v4 as uuidv4} from "uuid";
import {create} from "zustand";
import {subscribeWithSelector} from "zustand/middleware";
import type {Farm} from "../types/farm";



interface LocalStorageTypes {
    dwa_farm: Farm;
}

type LocalStoreState = {
    [K in keyof LocalStorageTypes]: {
        value: LocalStorageTypes[K];
        set: (value: LocalStorageTypes[K] | ((prev: LocalStorageTypes[K]) => LocalStorageTypes[K])) => void;
    };
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
        const createStub = <K extends keyof LocalStorageTypes>(key: K) => {
            return {
                value: loadFromStorage(key),
                set: (value: LocalStorageTypes[K] | ((prev: LocalStorageTypes[K]) => LocalStorageTypes[K])) => {
                    const next = value instanceof Function ? value(get()[key].value) : value;
                    try {
                        localStorage.setItem(key, JSON.stringify(value));
                    } catch (e) {
                        console.error(e);
                    }
                    set({[key]: next});
                }
            };
        };
        return ({
            dwa_farm: createStub("dwa_farm"),
        });
    })
);
