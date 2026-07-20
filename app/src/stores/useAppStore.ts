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
    tourStep: number;                    // nur für den (linearen) Demo-Rundgang
    tourSuspended: boolean;              // pausiert (per „Überspringen“) → fortsetzbar
    startTour: (variant: "demo" | "empty") => void;
    nextTourStep: () => void;            // Demo-Rundgang: einen Schritt weiter
    suspendTour: () => void;             // pausieren, fortsetzbar über Floating-Button
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
        tourSuspended: false,
        startTour: (variant) => set({tourActive: true, tourVariant: variant, tourStep: 0, tourSuspended: false}),
        nextTourStep: () => set((state) => ({tourStep: state.tourStep + 1})),
        suspendTour: () => set({tourActive: false, tourSuspended: true}),
        endTour: () => set({tourActive: false, tourStep: 0, tourSuspended: false}),
    }))
);
