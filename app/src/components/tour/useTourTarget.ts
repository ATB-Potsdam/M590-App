// src/components/tour/useTourTarget.ts
import {useEffect, useState} from "react";

export interface TargetRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

/**
 * Resolves the element with [data-tour="<target>"]. After a route change the
 * target is not yet in the DOM – therefore it is polled via requestAnimationFrame
 * until it appears (same pattern as the scrollIntoView in ProjectsPage/DemoHint).
 * It is then scrolled to center and its position is updated on scroll/resize.
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
            // Look up fresh: on re-renders React can replace the element with a new
            // one; a cached, detached element returns 0×0. A replaced element also
            // detaches the old ResizeObserver – so always re-resolve here and point
            // the observer at the current node.
            const cur = document.querySelector(selector);
            if (!cur) return;
            if (cur !== el) {
                el = cur;
                observer?.disconnect();
                observer = new ResizeObserver(measure);
                observer.observe(cur);
            }
            const r = cur.getBoundingClientRect();
            // Ignore 0×0 (not laid out/detached) – keep the old rect.
            if (r.width === 0 && r.height === 0) return;
            setRect({top: r.top, left: r.left, width: r.width, height: r.height});
        };

        // After the first find, the target size can still change: an assignment's
        // result pills only appear once the climate lookups have finished
        // asynchronously – the row grows AFTERWARDS. If that happens via a React
        // re-render, the observed node is replaced and the old ResizeObserver never
        // fires → the spotlight would stay too short (until the user scrolls).
        // Therefore actively re-measure for a few frames (re-query per frame) until
        // the rect is stable for a few frames or the time budget is exhausted.
        const settle = (framesLeft: number, stableFor: number) => {
            if (cancelled) return;
            const cur = document.querySelector(selector);
            const r = cur?.getBoundingClientRect();
            // While the layout is not yet settled, keep the target in view: the
            // one-time scrollIntoView at find time goes stale if the page reflows
            // afterwards (e.g. the summary computes its totals asynchronously and
            // grows, or we just navigated up from the assignment page). Re-scroll
            // first, THEN measure, so that the spotlight rect matches the final
            // viewport coordinates.
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

        // Wait for the target to appear AND be laid out. After a route change
        // querySelector may already match the element while the page is not yet
        // rendered → rect 0×0 at the origin. Only once a real size is present is it
        // scrolled, measured and observed.
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
                // Re-measure for ~1.5s (90 frames) until the layout is settled.
                settleRaf = requestAnimationFrame(() => settle(90, 0));
            } else {
                // Not (meaningfully) present yet – keep polling.
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
            // On target change (or teardown) discard the old rect, so the
            // spotlight does not briefly linger at the old location.
            setRect(null);
        };
    }, [target]);

    return rect;
};
