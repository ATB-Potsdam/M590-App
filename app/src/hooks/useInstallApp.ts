import {useEffect, useState} from "react";
import {isNative} from "../lib/nativeShare";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{outcome: "accepted" | "dismissed";}>;
}

const isStandalone = () =>
    window.matchMedia("(display-mode: standalone)").matches
    || (navigator as Navigator & {standalone?: boolean;}).standalone === true;

const detectIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
    && !(window as Window & {MSStream?: unknown;}).MSStream;

let cachedEvent: BeforeInstallPromptEvent | null = null;

if (typeof window !== "undefined" && !isNative() && !isStandalone()) {
    window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        cachedEvent = e as BeforeInstallPromptEvent;
        window.dispatchEvent(new Event("dwa:install-available"));
    });
    window.addEventListener("appinstalled", () => {
        cachedEvent = null;
        window.dispatchEvent(new Event("dwa:install-available"));
    });
}

export interface InstallApp {
    /** True when in native Capacitor shell or already installed as PWA. */
    alreadyInstalled: boolean;
    /** True when iOS Safari (manual install via Share menu). */
    isIOS: boolean;
    /** True when an Android/Chromium install prompt is available. */
    canPrompt: boolean;
    /** Trigger the native install prompt. iOS path: caller should show instructions. */
    prompt: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

export const useInstallApp = (): InstallApp => {
    const [, setTick] = useState(0);

    useEffect(() => {
        const handler = () => setTick((n) => n + 1);
        window.addEventListener("dwa:install-available", handler);
        return () => window.removeEventListener("dwa:install-available", handler);
    }, []);

    const alreadyInstalled = isNative() || isStandalone();
    const isIOS = !alreadyInstalled && detectIOS();
    const canPrompt = !alreadyInstalled && cachedEvent !== null;

    const prompt = (): Promise<"accepted" | "dismissed" | "unavailable"> => {
        if (!cachedEvent) return Promise.resolve("unavailable");
        const e = cachedEvent;
        e.prompt();
        return e.userChoice.then((c) => {
            cachedEvent = null;
            window.dispatchEvent(new Event("dwa:install-available"));
            return c.outcome;
        });
    };

    return {alreadyInstalled, isIOS, canPrompt, prompt};
};
