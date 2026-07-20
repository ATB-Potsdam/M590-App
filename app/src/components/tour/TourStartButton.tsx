// src/components/tour/TourStartButton.tsx
import {useLocalStore} from "../../stores/useLocalStore";
import {useAppStore} from "../../stores/useAppStore";
import "./TourResumeButton.scss";

/**
 * Schwebender Button, der nach dem Laden der Beispieldaten erscheint und den
 * Demo-Rundgang startet. Anders als der Button im ?-Dialog ist er dauerhaft und
 * leicht zu finden. Dismissbar über × (setzt dwa_tour_completed). Erscheint nicht
 * gleichzeitig mit dem TourResumeButton (der greift, sobald der Rundgang pausiert).
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
