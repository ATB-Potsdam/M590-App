// src/components/tour/TourResumeButton.tsx
import {useAppStore} from "../../stores/useAppStore";
import "./TourResumeButton.scss";

/**
 * Schwebender Button, der erscheint, wenn der Rundgang pausiert wurde
 * („Überspringen“/Escape). Setzt den Rundgang in derselben Variante fort –
 * beim Leerzustand-Rundgang beim nächsten offenen Schritt (zustandsgesteuert).
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
