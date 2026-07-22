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

    // Guided walk-through. Runtime state only – whether the tour has already
    // been completed is stored persistently in dwa_tour_completed.
    // "demo"  = walk-through of the loaded demo data
    // "empty" = walk-through that guides the creation of your own data (farm → field → …)
    tourActive: boolean;
    tourVariant: "demo" | "empty";
    tourStep: number;                    // only for the (linear) demo walk-through
    tourSuspended: boolean;              // paused (via "Überspringen") → resumable
    // IDs of empty-tour steps confirmed via "Weiter" (info-only sub-steps that have
    // no own state signal, e.g. the nFKWe explainer). currentEmptyStep treats these
    // as done. Reset on startTour.
    tourAdvanced: string[];
    startTour: (variant: "demo" | "empty") => void;
    resumeTour: () => void;              // resume a paused walk-through (tourStep is kept)
    nextTourStep: () => void;            // demo walk-through: advance one step
    prevTourStep: () => void;            // demo walk-through: step back one
    advanceEmptyStep: (id: string) => void; // empty walk-through: confirm a "Weiter" sub-step
    unadvanceEmptyStep: () => void;      // empty walk-through: undo the last "Weiter" sub-step
    suspendTour: () => void;             // pause, resumable via the floating button
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
        tourAdvanced: [],
        startTour: (variant) => set({tourActive: true, tourVariant: variant, tourStep: 0, tourSuspended: false, tourAdvanced: []}),
        // Resume without resetting tourStep – the demo walk-through is
        // index-based and would otherwise start over from the beginning.
        resumeTour: () => set({tourActive: true, tourSuspended: false}),
        nextTourStep: () => set((state) => ({tourStep: state.tourStep + 1})),
        prevTourStep: () => set((state) => ({tourStep: Math.max(0, state.tourStep - 1)})),
        advanceEmptyStep: (id) => set((state) =>
            state.tourAdvanced.includes(id) ? state : {tourAdvanced: [...state.tourAdvanced, id]}),
        // Undo the most recently confirmed "Weiter" sub-step → currentEmptyStep
        // returns it again (only valid across the form's button sub-steps).
        unadvanceEmptyStep: () => set((state) => ({tourAdvanced: state.tourAdvanced.slice(0, -1)})),
        suspendTour: () => set({tourActive: false, tourSuspended: true}),
        endTour: () => set({tourActive: false, tourStep: 0, tourSuspended: false}),
    }))
);
