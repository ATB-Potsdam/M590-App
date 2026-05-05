// src/pages/ProjectsPage.tsx
import {useState} from "react";
import {useNavigate} from "react-router";
import {OnboardingBanner} from "../components/OnboardingBanner";
import {ProjectForm} from "../components/ProjectForm";
import {useFarm} from "../hooks/useFarm";
import {useProjects} from "../hooks/useProjects";
import {getAssignmentResult, sumResults} from "../lib/calculations/getAssignmentResult";
import type {AssignmentResult} from "../lib/calculations/getAssignmentResult";
import {formatRange} from "../lib/formatNum";
import "./ProjectsPage.scss";

export const ProjectsPage = () => {
    const {projects, addProject, copyProject, removeProject} = useProjects();
    const {farm} = useFarm();
    const [showForm, setShowForm] = useState(false);
    const navigate = useNavigate();

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

            {projects.length === 0 && !showForm && (
                <p className="projects-page__empty">
                    Noch keine Szenarien vorhanden. Legen Sie mit „+ Neues Szenario" Ihr erstes Bewässerungsszenario an.
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
                    const {normalM3, dryM3, nettoM3, totalAltWasserM3} = sumResults(results);

                    return (
                    <li key={project.id} className="project-list__item">
                        <div
                            className="project-list__main"
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
                            {normalM3 && (
                                <div className="project-list__water">
                                    <span className="result-pill result-pill--normal">
                                        🌤 {formatRange(normalM3, "m³/a")}
                                    </span>
                                    {dryM3 && (
                                        <span className="result-pill result-pill--dry">
                                            ☀️ {formatRange(dryM3, "m³/a")}
                                        </span>
                                    )}
                                    {totalAltWasserM3 > 0 && nettoM3 && (
                                        <span className="result-pill result-pill--normal">
                                            Netto {formatRange(nettoM3, "m³/a")}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                        <button
                            className="project-list__delete"
                            onClick={() => removeProject(project.id)}
                            title="Szenario löschen"
                        >
                            🗑
                        </button>
                    </li>
                    );
                })}
            </ul>

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
    );
};
