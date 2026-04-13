// src/hooks/useIsScrolledToBottom.ts
import {useEffect, useState} from "react";

const THRESHOLD_PX = 8;

const checkAtBottom = (): boolean =>
    window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - THRESHOLD_PX;

export const useIsScrolledToBottom = (locationKey: string, splashDismissed: boolean): boolean => {
    // Start as true (shadow hidden) — rAF corrects it after first paint
    const [atBottom, setAtBottom] = useState(true);

    // Re-check after navigation, route change, or splash dismissal.
    // Double rAF ensures layout is fully settled before measuring scrollHeight.
    useEffect(() => {
        if (!splashDismissed) return;
        let rafId = requestAnimationFrame(() => {
            rafId = requestAnimationFrame(() => {
                setAtBottom(checkAtBottom());
            });
        });
        return () => cancelAnimationFrame(rafId);
    }, [locationKey, splashDismissed]);

    useEffect(() => {
        const handler = () => setAtBottom(checkAtBottom());
        window.addEventListener("scroll", handler, {passive: true});
        window.addEventListener("resize", handler, {passive: true});
        return () => {
            window.removeEventListener("scroll", handler);
            window.removeEventListener("resize", handler);
        };
    }, []);

    return atBottom;
};
