// src/hooks/useIsScrolledToBottom.ts
import {useEffect, useState} from "react";

const THRESHOLD_PX = 8;

const checkAtBottom = (): boolean =>
    window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - THRESHOLD_PX;

export const useIsScrolledToBottom = (): boolean => {
    const [atBottom, setAtBottom] = useState(checkAtBottom);

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
