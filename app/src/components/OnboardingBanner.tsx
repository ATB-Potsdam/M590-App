// src/components/OnboardingBanner.tsx
import {useLocation, useNavigate} from "react-router";
import {useFarm} from "../hooks/useFarm";
import {useProjects} from "../hooks/useProjects";
import {useLocalStore} from "../stores/useLocalStore";
import "./OnboardingBanner.scss";

export const OnboardingBanner = () => {
    const {farm} = useFarm();
    const {projects} = useProjects();
    const [bannerDismissed, setBannerDismissed] = useLocalStore((s) => s.dwa_banner_dismissed);
    const navigate = useNavigate();
    const {pathname} = useLocation();

    if (bannerDismissed) return null;

    const hasFarm = farm.name.trim().length > 0 && farm.fields.length > 0;
    const hasProject = projects.length > 0;
    const hasAssignment = projects.some((p) => p.fieldAssignments.some((fa) => fa.module));

    // Auto-hide once all three steps are complete
    if (hasFarm && hasProject && hasAssignment) return null;

    const steps: {label: string; done: boolean; icon: string}[] = [
        {icon: "🏡", label: "Betrieb einrichten", done: hasFarm},
        {icon: "🌾", label: "Szenario anlegen", done: hasProject},
        {icon: "💧", label: "Nutzung zuweisen", done: hasAssignment},
    ];

    // Next action: first incomplete step that is reachable
    let nextLabel: string | null = null;
    let nextPath: string | null = null;
    if (!hasFarm && pathname !== "/farm") {
        nextLabel = "→ Betrieb einrichten";
        nextPath = "/farm";
    } else if (hasFarm && !hasProject && pathname !== "/") {
        nextLabel = "→ Szenario anlegen";
        nextPath = "/";
    }
    // Step 3 (Nutzung) has no single target URL — user must pick a scenario first

    return (
        <div className="onboarding-banner">
            <div className="onboarding-banner__body">
                <div className="onboarding-banner__steps">
                    {steps.map((step, i) => (
                        <div
                            key={i}
                            className={`onboarding-banner__step${step.done ? " onboarding-banner__step--done" : ""}`}
                        >
                            <span className="onboarding-banner__step-icon">{step.icon}</span>
                            <span className="onboarding-banner__step-label">{step.label}</span>
                            <span className="onboarding-banner__step-check">{step.done ? "✓" : ""}</span>
                        </div>
                    ))}
                </div>
                {nextPath && nextLabel && (
                    <button
                        className="onboarding-banner__next"
                        onClick={() => navigate(nextPath!)}
                    >
                        {nextLabel}
                    </button>
                )}
            </div>
            <button
                className="onboarding-banner__close"
                onClick={() => setBannerDismissed(true)}
                title="Hinweis schließen"
                aria-label="Hinweis schließen"
            >
                ×
            </button>
        </div>
    );
};
