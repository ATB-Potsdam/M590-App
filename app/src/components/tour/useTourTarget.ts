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
        let settleRaf = 0;
        let observer: ResizeObserver | null = null;
        let el: Element | null = null;
        let cancelled = false;
        let lastKey = "";
        const selector = `[data-tour="${target}"]`;

        const measure = () => {
            // Frisch nachschlagen: React kann das Element bei Re-Renders durch ein
            // neues ersetzen; ein gecachtes, abgehängtes Element liefert 0×0. Ein
            // ersetztes Element hängt zudem den alten ResizeObserver ab – darum hier
            // immer neu auflösen und den Observer auf den aktuellen Knoten setzen.
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

        // Nach dem ersten Fund kann sich die Ziel-Größe noch ändern: die Ergebnis-
        // Pills einer Zuweisung erscheinen erst, wenn die Klima-Lookups asynchron
        // fertig sind – die Zeile wächst DANACH. Passiert das per React-Re-Render,
        // wird der beobachtete Knoten ersetzt und der alte ResizeObserver feuert
        // nie → der Spotlight bliebe zu kurz (bis der Anwender scrollt). Darum ein
        // paar Frames lang aktiv nachmessen (re-query je Frame), bis das Rechteck
        // ein paar Frames stabil ist bzw. das Zeitbudget erschöpft ist.
        const settle = (framesLeft: number, stableFor: number) => {
            if (cancelled) return;
            const cur = document.querySelector(selector);
            const r = cur?.getBoundingClientRect();
            // Solange das Layout noch nicht ruhig ist, das Ziel im Sichtbereich
            // halten: der einmalige scrollIntoView beim Fund wird stale, wenn die
            // Seite danach umbricht (z. B. die Zusammenfassung berechnet ihre
            // Summen asynchron und wächst, oder wir sind gerade von der Zuweisungs-
            // Seite hochnavigiert). Erst re-scrollen, DANN messen, damit das
            // Spotlight-Rechteck zu den finalen Viewport-Koordinaten passt.
            if (cur && r && !(r.width === 0 && r.height === 0)) {
                const vh = window.innerHeight;
                const fullyVisible = r.top >= 0 && r.bottom <= vh;
                if (!fullyVisible) cur.scrollIntoView({behavior: "auto", block: "center"});
            }
            const rr = cur?.getBoundingClientRect() ?? r;
            const key = rr ? `${Math.round(rr.top)}:${Math.round(rr.left)}:${Math.round(rr.width)}:${Math.round(rr.height)}` : "";
            measure();
            const stable = key !== "" && key === lastKey ? stableFor + 1 : 0;
            lastKey = key;
            if (framesLeft > 0 && stable < 5) {
                settleRaf = requestAnimationFrame(() => settle(framesLeft - 1, stable));
            }
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
                observer = new ResizeObserver(measure);
                observer.observe(found);
                window.addEventListener("scroll", measure, {passive: true, capture: true});
                window.addEventListener("resize", measure);
                // ~1.5s (90 Frames) lang nachmessen, bis das Layout ruhig ist.
                settleRaf = requestAnimationFrame(() => settle(90, 0));
            } else {
                // Noch nicht (sinnvoll) da – weiter pollen.
                raf = requestAnimationFrame(poll);
            }
        };
        raf = requestAnimationFrame(poll);

        return () => {
            cancelled = true;
            cancelAnimationFrame(raf);
            cancelAnimationFrame(settleRaf);
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
