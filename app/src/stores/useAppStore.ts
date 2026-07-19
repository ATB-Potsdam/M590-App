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

    // Geführter Rundgang (Walk-Through). Nur Laufzeit-Zustand – ob der Rundgang
    // schon absolviert wurde, steckt persistent in dwa_tour_completed.
    // "demo"  = Rundgang durch die geladenen Beispieldaten
    // "empty" = Rundgang, der beim Anlegen eigener Daten anleitet (Betrieb → Feld → …)
    tourActive: boolean;
    tourVariant: "demo" | "empty";
    tourStep: number;
    startTour: (variant: "demo" | "empty") => void;
    nextTourStep: () => void;
    endTour: () => void;
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

        tourActive: false,
        tourVariant: "demo",
        tourStep: 0,
        startTour: (variant) => set({tourActive: true, tourVariant: variant, tourStep: 0}),
        nextTourStep: () => set((state) => ({tourStep: state.tourStep + 1})),
        endTour: () => set({tourActive: false, tourStep: 0}),
    }))
);
