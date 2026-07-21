// src/components/AssignmentSteps.tsx
import "./AssignmentSteps.scss";

export type AssignmentPhase = "module" | "details" | "result";

const STEPS: {key: AssignmentPhase; label: string}[] = [
    {key: "module", label: "Nutzung"},
    {key: "details", label: "Details"},
    {key: "result", label: "Ergebnis"},
];

interface Props {
    current: AssignmentPhase;
}

/**
 * Orientation progress indicator for the assignment (Zuweisung) screen.
 * Shows the three macro phases (Nutzung → Details → Ergebnis) so users
 * know where they are and what is still to come. Purely informational, not clickable.
 */
export const AssignmentSteps = ({current}: Props) => {
    const currentIdx = STEPS.findIndex((s) => s.key === current);

    return (
        <ol className="assignment-steps" aria-label="Fortschritt" data-tour="assignment-steps">
            {STEPS.map((step, i) => {
                const state = i < currentIdx ? "done" : i === currentIdx ? "active" : "upcoming";
                return (
                    <li key={step.key} className={`assignment-steps__step assignment-steps__step--${state}`}>
                        <span className="assignment-steps__marker" aria-hidden>
                            {state === "done" ? "✓" : i + 1}
                        </span>
                        <span className="assignment-steps__label">{step.label}</span>
                    </li>
                );
            })}
        </ol>
    );
};
