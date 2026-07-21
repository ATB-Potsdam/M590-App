// src/components/tour/TourResumeButton.tsx
import {useAppStore} from "../../stores/useAppStore";
import "./TourResumeButton.scss";

/**
 * Floating button that appears when the walk-through has been paused
 * ("Überspringen"/Escape). Resumes the walk-through in the same variant –
 * for the empty-state walk-through at the next open step (state-driven).
 */
export const TourResumeButton = () => {
    const tourActive = useAppStore((s) => s.tourActive);
    const tourSuspended = useAppStore((s) => s.tourSuspended);
    const resumeTour = useAppStore((s) => s.resumeTour);
    const endTour = useAppStore((s) => s.endTour);

    if (tourActive || !tourSuspended) return null;

    return (
        <div className="tour-resume">
            <button
                type="button"
                className="tour-resume__btn"
                onClick={resumeTour}
            >
                🧭 Rundgang fortsetzen
            </button>
            <button
                type="button"
                className="tour-resume__close"
                title="Nicht mehr anzeigen"
                aria-label="Rundgang beenden"
                onClick={endTour}
            >
                ×
            </button>
        </div>
    );
};
