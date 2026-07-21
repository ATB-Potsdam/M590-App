// src/components/tour/TourStartButton.tsx
import {useLocalStore} from "../../stores/useLocalStore";
import {useAppStore} from "../../stores/useAppStore";
import "./TourResumeButton.scss";

/**
 * Floating button that appears after the demo data has been loaded and starts
 * the demo walk-through. Unlike the button in the ?-dialog it is persistent and
 * easy to find. Dismissable via × (sets dwa_tour_completed). Does not appear at
 * the same time as the TourResumeButton (which kicks in once the walk-through is
 * paused).
 */
export const TourStartButton = () => {
    const [projects] = useLocalStore((s) => s.dwa_projects);
    const [tourCompleted, setTourCompleted] = useLocalStore((s) => s.dwa_tour_completed);
    const tourActive = useAppStore((s) => s.tourActive);
    const tourSuspended = useAppStore((s) => s.tourSuspended);
    const startTour = useAppStore((s) => s.startTour);

    const hasDemo = projects.some((p) => p.isDemo);
    if (!hasDemo || tourCompleted || tourActive || tourSuspended) return null;

    return (
        <div className="tour-resume">
            <button
                type="button"
                className="tour-resume__btn"
                onClick={() => startTour("demo")}
            >
                🧭 Rundgang durch die Beispieldaten
            </button>
            <button
                type="button"
                className="tour-resume__close"
                title="Nicht mehr anzeigen"
                aria-label="Rundgang nicht anzeigen"
                onClick={() => setTourCompleted(true)}
            >
                ×
            </button>
        </div>
    );
};
