// src/components/OnboardingBanner.tsx
import {useLocation, useNavigate} from "react-router";
import {useFarm} from "../hooks/useFarm";
import {useProjects} from "../hooks/useProjects";
import {useAppStore} from "../stores/useAppStore";
import {useLocalStore} from "../stores/useLocalStore";
import "./OnboardingBanner.scss";

export const OnboardingBanner = () => {
    const {farm} = useFarm();
    const {projects} = useProjects();
    const [bannerDismissed, setBannerDismissed] = useLocalStore((s) => s.dwa_banner_dismissed);
    const tourActive = useAppStore((s) => s.tourActive);
    const navigate = useNavigate();
    const {pathname} = useLocation();

    if (bannerDismissed) return null;
    // Hide during the guided walk-through – the walk-through handles the
    // guidance and the banner would only compete with the spotlight.
    if (tourActive) return null;

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

    // Current step = first incomplete
    const currentIndex = steps.findIndex((s) => !s.done);

    // Next action: first incomplete step that is reachable
    let nextLabel: string | null = null;
    let nextPath: string | null = null;
    if (!hasFarm && pathname !== "/farm") {
        nextLabel = "Betrieb einrichten";
        nextPath = "/farm";
    } else if (hasFarm && !hasProject && pathname !== "/") {
        nextLabel = "Szenario anlegen";
        nextPath = "/";
    }
    // Step 3 (Nutzung) has no single target URL — user must pick a scenario first

    return (
        <div className="onboarding-banner">
            <div className="onboarding-banner__body">
                <div className="onboarding-banner__header">
                    <span className="onboarding-banner__title">Erste Schritte</span>
                    <span className="onboarding-banner__progress">
                        {steps.filter((s) => s.done).length} von {steps.length}
                    </span>
                </div>
                <div className="onboarding-banner__steps">
                    {steps.map((step, i) => {
                        const isCurrent = i === currentIndex;
                        const cls = [
                            "onboarding-banner__step",
                            step.done ? "onboarding-banner__step--done" : "",
                            isCurrent ? "onboarding-banner__step--current" : "",
                        ]
                            .filter(Boolean)
                            .join(" ");
                        return (
                            <div key={i} className={cls}>
                                <span className="onboarding-banner__step-num">
                                    {step.done ? "✓" : i + 1}
                                </span>
                                <span className="onboarding-banner__step-icon">{step.icon}</span>
                                <span className="onboarding-banner__step-label">{step.label}</span>
                            </div>
                        );
                    })}
                </div>
                {nextPath && nextLabel && (
                    <button
                        className="onboarding-banner__next"
                        onClick={() => navigate(nextPath!)}
                    >
                        {nextLabel} →
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
