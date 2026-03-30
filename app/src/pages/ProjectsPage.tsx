// src/pages/ProjectsPage.tsx
import {useState} from "react";
import {useNavigate} from "react-router";
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
        year: number | undefined,
        copyFromId?: string
    ) => {
        const id = copyFromId
            ? copyProject(copyFromId, name, year)
            : addProject(name, year);
        setShowForm(false);
        if (id) navigate(`/projects/${id}`);
    };

    return (
        <div className="page">
            <h1>Projekte</h1>

            {projects.length === 0 && !showForm && (
                <p className="projects-page__empty">Noch keine Projekte vorhanden.</p>
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
                            <strong>{project.name}</strong>
                            {project.year && <span className="project-list__year">{project.year}</span>}
                            <small>{project.fieldAssignments.length} Feldzuweisung(en)</small>
                            {normalM3 && (
                                <span className="project-list__water">
                                    🌤 {formatRange(normalM3, "m³/a")}
                                    {dryM3 && <> · ☀️ {formatRange(dryM3, "m³/a")}</>}
                                    {totalAltWasserM3 > 0 && nettoM3 && (
                                        <> · Netto {formatRange(nettoM3, "m³/a")}</>
                                    )}
                                </span>
                            )}
                        </div>
                        <button
                            className="project-list__delete"
                            onClick={() => removeProject(project.id)}
                            title="Projekt löschen"
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
                <button onClick={() => setShowForm(true)} style={{marginTop: 12}}>
                    + Neues Projekt
                </button>
            )}
        </div>
    );
};
