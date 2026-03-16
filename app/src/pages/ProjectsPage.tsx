// src/pages/ProjectsPage.tsx
import {useState} from "react";
import {useNavigate} from "react-router";
import {ProjectForm} from "../components/ProjectForm";
import {useProjects} from "../hooks/useProjects";
import "./ProjectsPage.scss";

export const ProjectsPage = () => {
    const {projects, addProject, copyProject, removeProject} = useProjects();
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
                {projects.map((project) => (
                    <li key={project.id} className="project-list__item">
                        <div
                            className="project-list__main"
                            onClick={() => navigate(`/projects/${project.id}`)}
                        >
                            <strong>{project.name}</strong>
                            {project.year && <span className="project-list__year">{project.year}</span>}
                            <small>{project.fieldAssignments.length} Feldzuweisung(en)</small>
                        </div>
                        <button
                            className="project-list__delete"
                            onClick={() => removeProject(project.id)}
                            title="Projekt löschen"
                        >
                            🗑
                        </button>
                    </li>
                ))}
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
