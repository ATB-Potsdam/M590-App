// src/pages/ProjectDetailPage.tsx
import {useState} from "react";
import {useNavigate, useParams} from "react-router";
import {getModuleLabel} from "../constants/modules";
import {useFarm} from "../hooks/useFarm";
import {useProjects} from "../hooks/useProjects";
import {getAssignmentResult, getMissingData, sumResults, type AssignmentResult} from "../lib/calculations/getAssignmentResult";
import {boundToLabel} from "../utils/irrigationPeriod";
import "./ProjectDetailPage.scss";

const formatRange = ([min, max]: [number, number], unit: string): string =>
    min === max ? `${min.toFixed(0)} ${unit}` : `${min.toFixed(0)}–${max.toFixed(0)} ${unit}`;

export const ProjectDetailPage = () => {
    const {id} = useParams<{id: string;}>();
    const navigate = useNavigate();
    const {projects, addFieldAssignment, removeFieldAssignment} = useProjects();
    const {farm} = useFarm();

    const [showAddField, setShowAddField] = useState(false);

    const project = projects.find((p) => p.id === id);

    if (!project) {
        return (
            <div className="page">
                <p>Projekt nicht gefunden.</p>
                <button onClick={() => navigate("/projects")}>← Zurück</button>
            </div>
        );
    }

    // Felder die noch NICHT zugewiesen sind
    const assignedFieldIds = new Set(project.fieldAssignments.map((fa) => fa.fieldId));
    const availableFields = farm.fields.filter((f) => !assignedFieldIds.has(f.id));

    const assignmentResults: (AssignmentResult | null)[] = project.fieldAssignments.map((fa) => {
        const field = farm.fields.find((f) => f.id === fa.fieldId);
        if (!field) return null;
        return getAssignmentResult(fa, field);
    });

    const {normalM3, dryM3} = sumResults(
        assignmentResults.filter((r): r is AssignmentResult => r !== null)
    );

    const pendingCount = project.fieldAssignments.filter((fa) => !fa.module).length;

    return (
        <div className="page">
            {/* Header */}
            <div className="project-detail__header">
                <button className="project-detail__back" onClick={() => navigate("/projects")}>
                    ← Projekte
                </button>
                <div>
                    <h1>{project.name}</h1>
                    <span className="project-detail__meta">
                        {project.year && <span>{project.year}</span>}
                    </span>
                </div>
            </div>

            {/* Feldzuweisungen */}
            <h2>Feldzuweisungen</h2>

            {project.fieldAssignments.length === 0 && (
                <p className="project-detail__empty">
                    Noch keine Felder zugewiesen. Füge einen Schlag hinzu.
                </p>
            )}

            <ul className="assignment-list">
                {project.fieldAssignments.map((fa, i) => {
                    const field = farm.fields.find((f) => f.id === fa.fieldId);
                    if (!field) return null;

                    return (
                        <li key={fa.id} className="assignment-list__item">
                            <div
                                className="assignment-list__main"
                                onClick={() => navigate(`/projects/${project.id}/assignment/${fa.id}`)}
                            >
                                {/* Zeile 1: Feldname + Fläche + Klimazone – unverändert */}
                                <div className="assignment-list__field">
                                    <strong>{field.name}</strong>
                                    <span>{field.areaHa} ha</span>
                                    {field.climateClassStatus === "done" && field.climateClass && (
                                        <span className="assignment-list__climate">🌿 {field.climateClass[0]}</span>
                                    )}
                                </div>

                                {/* Zeile 2: Modul + Pflanze – unverändert */}
                                <div className="assignment-list__module">
                                    {fa.module
                                        ? <span className="module-badge module-badge--set">{getModuleLabel(fa.module)}</span>
                                        : <span className="module-badge module-badge--empty">Nutzung wählen →</span>
                                    }
                                    {fa.plantKey && (
                                        <span className="assignment-list__plant">
                                            {fa.plantKey.split("|").slice(0, 2).join(" · ")}
                                        </span>
                                    )}
                                </div>

                                {/* Zeile 3: Bewässerungszeitraum – unverändert */}
                                {fa.irrigationPeriod && (
                                    <div className="assignment-list__period">
                                        📅 {boundToLabel(fa.irrigationPeriod.from)} – {boundToLabel(fa.irrigationPeriod.to)}
                                    </div>
                                )}

                                {/* Zeile 4: Berechnungsergebnis – neu */}
                                {(() => {
                                    const result = assignmentResults[i];
                                    const missing = result === null && fa.module
                                        ? getMissingData(fa, field)
                                        : [];

                                    if (result) return (
                                        <div className="assignment-list__result">
                                            {result.normal && (
                                                <span className="result-pill result-pill--normal">
                                                    🌤 {formatRange(result.normal.totalRangeM3, "m³/a")}
                                                </span>
                                            )}
                                            {result.dry && (
                                                <span className="result-pill result-pill--dry">
                                                    ☀️ {formatRange(result.dry.totalRangeM3, "m³/a")}
                                                </span>
                                            )}
                                        </div>
                                    );

                                    if (missing.length > 0) return (
                                        <div className="assignment-list__result">
                                            <span className="result-pill result-pill--pending">
                                                ⚠️ Fehlt: {missing.join(", ")}
                                            </span>
                                        </div>
                                    );

                                    return null;
                                })()}
                            </div>

                            <button
                                className="assignment-list__delete"
                                onClick={() => removeFieldAssignment(project.id, fa.id)}
                                title="Zuweisung entfernen"
                            >🗑</button>
                        </li>
                    );
                })}
            </ul>

            {/* Schlag hinzufügen */}
            {showAddField ? (
                <div className="project-detail__add-field">
                    <p style={{fontWeight: 600, margin: "0 0 8px"}}>Schlag auswählen:</p>
                    {availableFields.length === 0 ? (
                        <p className="project-detail__empty">
                            Alle Felder bereits zugewiesen.{" "}
                            <button className="link-btn" onClick={() => navigate("/farm")}>
                                Neue Felder anlegen →
                            </button>
                        </p>
                    ) : (
                        <ul className="field-picker">
                            {availableFields.map((field) => (
                                <li
                                    key={field.id}
                                    className="field-picker__item"
                                    onClick={() => {
                                        addFieldAssignment(project.id, field.id);
                                        setShowAddField(false);
                                    }}
                                >
                                    <strong>{field.name}</strong>
                                    <span>{field.areaHa} ha</span>
                                    {field.climateClassStatus === "done" && field.climateClass && (
                                        <span className="assignment-list__climate">🌿 {field.climateClass[0]}</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                    <button onClick={() => setShowAddField(false)} style={{marginTop: 8}}>
                        Abbrechen
                    </button>
                </div>
            ) : (
                <button onClick={() => setShowAddField(true)} style={{marginTop: 4}}>
                    + Schlag hinzufügen
                </button>
            )}

            {/* Projektzusammenfassung – Platzhalter bis Berechnungen implementiert */}
            {project.fieldAssignments.length > 0 && (
                <section className="project-summary">
                    <h2>Zusammenfassung</h2>

                    <div className="project-summary__row">
                        <span>Schläge</span>
                        <span>{project.fieldAssignments.length}</span>
                    </div>

                    <div className="project-summary__row">
                        <span>Gesamtfläche</span>
                        <span>
                            {project.fieldAssignments
                                .reduce((sum, fa) => sum + (farm.fields.find((f) => f.id === fa.fieldId)?.areaHa ?? 0), 0)
                                .toFixed(1)} ha
                        </span>
                    </div>

                    {normalM3 && (
                        <div className="project-summary__row project-summary__row--result">
                            <span>🌤 Normaljahr gesamt</span>
                            <strong>{formatRange(normalM3, "m³/a")}</strong>
                        </div>
                    )}

                    {dryM3 && (
                        <div className="project-summary__row project-summary__row--result">
                            <span>☀️ Trockenjahr gesamt</span>
                            <strong>{formatRange(dryM3, "m³/a")}</strong>
                        </div>
                    )}

                    {pendingCount > 0 && (
                        <div className="project-summary__row project-summary__row--pending">
                            <span>⚠️ Ohne Nutzung</span>
                            <span>{pendingCount} Schlag/Schläge</span>
                        </div>
                    )}
                </section>
            )}
        </div>
    );
};
