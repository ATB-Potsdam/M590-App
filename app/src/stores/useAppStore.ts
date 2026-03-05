import {create} from "zustand";
import {subscribeWithSelector} from "zustand/middleware";
import {defaultFarm, STORAGE_KEY as FARM_STORAGE_KEY} from "../hooks/useFarm";
import type {WasmLayer} from "../pkg/polylookup";
import type {Farm} from "../types/farm";

export interface MessageType {
    type: "error" | "info" | "warning";
    message: string[];
}

const MessageTimeout = 5000; // 5 seconds

export const loadFarm = (): Farm => {
    try {
        const item = localStorage.getItem(FARM_STORAGE_KEY);
        return item ? (JSON.parse(item) as Farm) : defaultFarm;
    } catch {
        return defaultFarm;
    }
};

export const saveFarm = (farm: Farm) => {
    try {
        localStorage.setItem(FARM_STORAGE_KEY, JSON.stringify(farm));
    } catch (e) {
        console.error(e);
    }
};



type AppState = {
    // State
    layer?: WasmLayer;
    setLayer: (layer: WasmLayer) => void;

    farm?: Farm;
    setFarm: (farm: Farm | ((prev: Farm) => Farm)) => void;

    messages: MessageType[];
    addMessage: (message: MessageType) => MessageType;
    delMessage: (message: MessageType) => void;
};

export const useAppStore = create<AppState>()(
    subscribeWithSelector((set, get) => ({
        layer: undefined,
        setLayer: (layer: WasmLayer) => set({layer}),

        farm: loadFarm(),
        setFarm: (value) => {
            const next = value instanceof Function ? value(get().farm || defaultFarm) : value;
            saveFarm(next);
            set({farm: next});
        },

        messages: [],
        addMessage: (message: MessageType) => {
            set((state) => ({
                ...state,
                messages: [...state.messages, message],
            }));
            setTimeout(
                () =>
                    set((state) => ({
                        ...state,
                        messages: state.messages.filter((m) => m !== message),
                    })),
                MessageTimeout
            );
            return message;
        },
        delMessage: (message: MessageType) => {
            set((state) => ({
                ...state,
                messages: state.messages.filter((m) => m !== message),
            }));
        },
    }))
);
