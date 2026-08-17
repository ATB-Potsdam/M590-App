import {useEffect} from "react";
import {App as CapacitorApp} from "@capacitor/app";
import {isNative} from "../lib/nativeShare";
import {useAppStore} from "../stores/useAppStore";

/**
 * Android hardware/gesture back.
 *
 * Capacitor 8 no longer walks the WebView history on a back press, so with no
 * listener the press falls through to the system and closes the activity — from
 * a project detail page the app just exited. This restores the expected
 * behaviour: go up one level, and only exit when there is nowhere left to go.
 *
 * Order matters. The guided tour lives in store state rather than in history, so
 * it has to be handled explicitly or a back press would navigate the page out
 * from under an active spotlight. The onboarding overlay needs no case of its
 * own: it pushes a history entry when it opens (see App.tsx) and closes on
 * `popstate`, so the ordinary history step below dismisses it.
 *
 * No-op on the web, where the browser owns the back button.
 */
export const useNativeBackButton = (): void => {
    useEffect(() => {
        if (!isNative()) return;

        const handle = CapacitorApp.addListener("backButton", () => {
            const {tourActive, suspendTour} = useAppStore.getState();

            // 1. An active walk-through absorbs the press (same as Escape).
            if (tourActive) {
                suspendTour();
                return;
            }

            // 2. Anything left in history: step up one level. This covers the
            //    onboarding overlay's pushed entry as well as normal navigation.
            //    `history.length > 1` is the only signal available — the History
            //    API exposes no "can go back" — and it is reliable here because
            //    the shell always starts at index 0 on its own entry.
            if (window.history.length > 1) {
                window.history.back();
                return;
            }

            // 3. Nothing to go back to: let the press do what the platform
            //    expects on a root screen and leave the app.
            CapacitorApp.exitApp().catch(() => {/* nothing sensible to do */});
        });

        return () => {
            // addListener resolves to the handle; remove it on unmount so a
            // remount cannot stack duplicate listeners.
            handle.then((h) => h.remove()).catch(() => {/* never registered */});
        };
    }, []);
};
