// src/pages/ProjectsPage.tsx
import {useEffect, useRef, useState} from "react";
import {useNavigate} from "react-router";
import {InfoHint} from "../components/InfoHint";
import {OnboardingBanner} from "../components/OnboardingBanner";
import {ProjectForm} from "../components/ProjectForm";
import {useFarm} from "../hooks/useFarm";
import {useProjects} from "../hooks/useProjects";
import {getAssignmentResult, sumResults} from "../lib/calculations/getAssignmentResult";
import type {AssignmentResult} from "../lib/calculations/getAssignmentResult";
import {tourProjectId} from "../components/tour/tourSteps";
import {formatRange} from "../lib/formatNum";
import "./ProjectsPage.scss";

export const ProjectsPage = () => {
    const {projects, addProject, copyProject, removeProject} = useProjects();
    const {farm} = useFarm();
    // The row highlighted by the Rundgang (tour) step "Szenario öffnen" (open scenario) – the same
    // one that currentProjectId uses for the follow-up routes (not just the demo row).
    const tourRowId = tourProjectId(projects);
    const [showForm, setShowForm] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const deleteConfirmRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!confirmDeleteId) return;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                deleteConfirmRef.current?.scrollIntoView({behavior: "smooth", block: "center"});
            });
        });
    }, [confirmDeleteId]);

    const handleSave = (
        name: string,
        description: string | undefined,
        copyFromId?: string
    ) => {
        const id = copyFromId
            ? copyProject(copyFromId, name, description)
            : addProject(name, description);
        setShowForm(false);
        if (id) navigate(`/projects/${id}`);
    };

    return (
        <div className="page">
            <h1>Szenarien</h1>

            <OnboardingBanner />

            <InfoHint summary="Wofür sind Szenarien da?">
                Ein Szenario ist eine <strong>Nutzungsvariante</strong> Ihrer Flächen. Von
                Szenario zu Szenario ändern sich nur die Zuweisungen: welche Flächen enthalten
                sind, welches Nutzungsmodul und welche Kultur sie haben und welche Zuschläge
                gesetzt sind. So können Sie z. B. zwei Fruchtfolgen anlegen und vergleichen,
                wie sich der Zusatzwasserbedarf ändert.
                <br /><br />
                Standort, Bodenklasse und Klimadaten gehören dagegen zur <strong>Fläche</strong>
                {" "}und sind in allen Szenarien gleich – ein Szenario ist deshalb weder ein Jahr
                noch ein Trocken-/Normalfall: <strong>Normal- und Trockenjahr werden immer beide
                berechnet</strong> und nebeneinander ausgewiesen.
            </InfoHint>

            {projects.length === 0 && !showForm && (
                <p className="projects-page__empty">
                    Noch keine Szenarien vorhanden. Legen Sie mit „+ Neues Szenario“ Ihr erstes Bewässerungsszenario an.
                </p>
            )}

            <ul className="project-list">
                {projects.map((project) => {
                    const results = project.fieldAssignments
                        .map((fa) => {
                            const field = farm.fields.find((f) => f.id === fa.fieldId);
                            if (!field) return null;
                            return getAssignmentResult(fa, field);
                        })
                        .filter((r): r is AssignmentResult => r !== null);
                    const {normalM3, dryM3, yearlyM3, nettoM3, totalAltWasserM3} = sumResults(results);

                    return (
                    <li key={project.id} className="project-list__item-wrap">
                        <div className="project-list__item">
                            <div
                                className="project-list__main"
                                data-tour={project.id === tourRowId ? "project-row" : undefined}
                                onClick={() => navigate(`/projects/${project.id}`)}
                            >
                                <div className="project-list__name-row">
                                    <strong>{project.name}</strong>
                                    <small className="project-list__count">
                                        {project.fieldAssignments.length === 0
                                            ? "ohne Feldzuweisung"
                                            : `${project.fieldAssignments.length} ${project.fieldAssignments.length === 1 ? "Feldzuweisung" : "Feldzuweisungen"}`}
                                    </small>
                                </div>
                                {project.description && <span className="project-list__description">{project.description}</span>}
                                {/* One pill per sum that exists. Sport/green areas carry a
                                    single Jahresrichtwert and get their own pill instead of
                                    being folded into the Normaljahr one — a pure golf
                                    project has no scenario pills at all. */}
                                {(normalM3 || yearlyM3) && (
                                    <div className="project-list__water">
                                        {normalM3 && (
                                            <span className="result-pill result-pill--normal">
                                                🌤 {formatRange(normalM3, "m³/a")}
                                            </span>
                                        )}
                                        {dryM3 && (
                                            <span className="result-pill result-pill--dry">
                                                ☀️ {formatRange(dryM3, "m³/a")}
                                            </span>
                                        )}
                                        {yearlyM3 && (
                                            <span className="result-pill result-pill--yearly" title="Jahresrichtwert Sport-/Grünflächen – kein Normal-/Trockenjahr">
                                                📅 {formatRange(yearlyM3, "m³/a")}
                                            </span>
                                        )}
                                        {totalAltWasserM3 > 0 && nettoM3 && (
                                            <span className="result-pill result-pill--normal">
                                                🌤 Netto {formatRange(nettoM3, "m³/a")}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                            <button
                                className="project-list__delete"
                                onClick={() => setConfirmDeleteId(project.id)}
                                title="Szenario löschen"
                            >
                                🗑
                            </button>
                        </div>
                        {confirmDeleteId === project.id && (
                            <div ref={deleteConfirmRef} className="project-list__delete-confirm">
                                <strong>Szenario „{project.name}“ löschen?</strong>
                                <p>Alle Feldzuweisungen dieses Szenarios gehen verloren.</p>
                                <div className="project-list__delete-confirm-actions">
                                    <button
                                        className="project-list__delete-confirm-btn"
                                        onClick={() => {
                                            removeProject(project.id);
                                            setConfirmDeleteId(null);
                                        }}
                                    >
                                        Ja, löschen
                                    </button>
                                    <button onClick={() => setConfirmDeleteId(null)}>Abbrechen</button>
                                </div>
                            </div>
                        )}
                    </li>
                    );
                })}
            </ul>

            <div data-tour="add-scenario">
                {showForm ? (
                    <ProjectForm
                        existingProjects={projects}
                        onSave={handleSave}
                        onCancel={() => setShowForm(false)}
                    />
                ) : (
                    <button onClick={() => setShowForm(true)} className="projects-page__add-btn">
                        + Neues Szenario
                    </button>
                )}
            </div>
        </div>
    );
};
