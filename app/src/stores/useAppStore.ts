import {create} from "zustand";
import {subscribeWithSelector} from "zustand/middleware";
import type {WasmLayer} from "../pkg/polylookup";

export interface MessageType {
    type: "error" | "info" | "warning";
    message: string[];
}

const MessageTimeout = 5000; // 5 seconds


type AppState = {
    // State
    layer?: WasmLayer;
    setLayer: (layer: WasmLayer) => void;

    messages: MessageType[];
    addMessage: (message: MessageType) => MessageType;
    delMessage: (message: MessageType) => void;
};

export const useAppStore = create<AppState>()(
    subscribeWithSelector((set) => ({
        layer: undefined,
        setLayer: (layer: WasmLayer) => set({layer}),

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
