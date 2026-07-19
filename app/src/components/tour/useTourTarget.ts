// src/components/tour/useTourTarget.ts
import {useEffect, useState} from "react";

export interface TargetRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

/**
 * Löst das Element mit [data-tour="<target>"] auf. Nach einem Routenwechsel ist
 * das Ziel noch nicht im DOM – deshalb wird per requestAnimationFrame gepollt,
 * bis es erscheint (gleiches Muster wie das scrollIntoView in ProjectsPage/DemoHint).
 * Danach wird es zentriert gescrollt und die Position bei Scroll/Resize aktualisiert.
 */
export const useTourTarget = (target: string | null): TargetRect | null => {
    const [rect, setRect] = useState<TargetRect | null>(null);

    useEffect(() => {
        if (!target) return;

        let raf = 0;
        let observer: ResizeObserver | null = null;
        let el: Element | null = null;
        let cancelled = false;
        const selector = `[data-tour="${target}"]`;

        const measure = () => {
            // Frisch nachschlagen: React kann das Element bei Re-Renders durch ein
            // neues ersetzen; ein gecachtes, abgehängtes Element liefert 0×0.
            const cur = document.querySelector(selector);
            if (!cur) return;
            if (cur !== el) {
                el = cur;
                observer?.disconnect();
                observer = new ResizeObserver(measure);
                observer.observe(cur);
            }
            const r = cur.getBoundingClientRect();
            // 0×0 (nicht gelayoutet/abgehängt) ignorieren – altes Rechteck behalten.
            if (r.width === 0 && r.height === 0) return;
            setRect({top: r.top, left: r.left, width: r.width, height: r.height});
        };

        // Auf das Erscheinen UND das Layout des Ziels warten. Nach einem
        // Routenwechsel matcht querySelector das Element evtl. schon, während die
        // Seite noch nicht gerendert ist → Rechteck 0×0 am Ursprung. Erst wenn
        // eine echte Größe vorliegt, wird gescrollt, gemessen und beobachtet.
        const poll = () => {
            if (cancelled) return;
            const found = document.querySelector(selector);
            const r = found?.getBoundingClientRect();
            if (found && r && r.width > 0 && r.height > 0) {
                el = found;
                found.scrollIntoView({behavior: "auto", block: "center"});
                measure();
                // Nach Layout-Stabilisierung nachmessen (Scroll, Fonts, spätes Layout).
                raf = requestAnimationFrame(() => {
                    measure();
                    raf = requestAnimationFrame(measure);
                });
                observer = new ResizeObserver(measure);
                observer.observe(found);
                window.addEventListener("scroll", measure, {passive: true, capture: true});
                window.addEventListener("resize", measure);
            } else {
                // Noch nicht (sinnvoll) da – weiter pollen.
                raf = requestAnimationFrame(poll);
            }
        };
        raf = requestAnimationFrame(poll);

        return () => {
            cancelled = true;
            cancelAnimationFrame(raf);
            observer?.disconnect();
            window.removeEventListener("scroll", measure, {capture: true});
            window.removeEventListener("resize", measure);
            // Beim Wechsel des Ziels (oder Beenden) das alte Rechteck verwerfen,
            // damit der Spotlight nicht kurz am alten Ort stehen bleibt.
            setRect(null);
        };
    }, [target]);

    return rect;
};
