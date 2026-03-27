import {create} from "zustand";
import {subscribeWithSelector} from "zustand/middleware";
import type {WasmLayer} from "../pkg/polylookup";
import type {RasterLookup} from "../types/raster";

export interface MessageType {
    type: "error" | "info" | "warning";
    message: string[];
}

const MessageTimeout = 5000; // 5 seconds


type AppState = {
    // State
    climateLayer?: WasmLayer;
    nfkweLayer?: WasmLayer;

    precipitationLookup?: RasterLookup;
    et0Lookup?: RasterLookup;

    messages: MessageType[];
    addMessage: (message: MessageType) => MessageType;
    delMessage: (message: MessageType) => void;
};

export const useAppStore = create<AppState>()(
    subscribeWithSelector((set) => ({
        climateLayer: undefined,

        precipitationLookup: undefined,
        et0Lookup: undefined,

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
