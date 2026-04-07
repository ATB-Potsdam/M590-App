// src/pages/ProjectDetailPage.tsx
import {useState} from "react";
import {useNavigate, useParams} from "react-router";
import {getModuleLabel} from "../constants/modules";
import {useFarm} from "../hooks/useFarm";
import {useProjects} from "../hooks/useProjects";
import {getAssignmentResult, getMissingData, sumResults, type AssignmentResult} from "../lib/calculations/getAssignmentResult";
import {formatNum, formatRange} from "../lib/formatNum";
import {generateSummaryPdf, sharePdf} from "../lib/generateSummaryPdf";
import {emojiToPngDataUrl, svgUrlToPngDataUrl} from "../lib/svgToPngDataUrl";
import {useAppStore} from "../stores/useAppStore";
import {boundToLabel} from "../utils/irrigationPeriod";
import "./ProjectDetailPage.scss";

const base = import.meta.env.BASE_URL;

export const ProjectDetailPage = () => {
    const {id} = useParams<{id: string;}>();
    const navigate = useNavigate();
    const {projects, addFieldAssignment, removeFieldAssignment} = useProjects();
    const {farm} = useFarm();

    const [showAddField, setShowAddField] = useState(false);
    const addMessage = useAppStore((s) => s.addMessage);

    const project = projects.find((p) => p.id === id);

    if (!project) {
        return (
            <div className="page">
                <p>Szenario nicht gefunden.</p>
                <button onClick={() => navigate("/")}>← Zurück</button>
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

    const {normalMm, normalM3, dryMm, dryM3, totalAltWasserM3, nettoM3: nettoM3Raw} = sumResults(
        assignmentResults.filter((r): r is AssignmentResult => r !== null)
    );

    const normalCount = assignmentResults.filter(r =>
        r?.normal && (!("hasValue" in r.normal) || r.normal.hasValue)
    ).length;
    const dryCount = assignmentResults.filter(r =>
        r?.dry && (!("hasValue" in r.dry) || r.dry.hasValue)
    ).length;
    const assignedCount = project.fieldAssignments.filter(fa => fa.module).length;

    // Only show netto deduction when ALL assigned fields contribute to that scenario
    const nettoM3: [number, number] | null = normalCount === assignedCount ? nettoM3Raw : null;
    const nettoDryM3: [number, number] | null = dryM3 && totalAltWasserM3 > 0 && dryCount === assignedCount
        ? [Math.max(0, dryM3[0] - totalAltWasserM3), Math.max(0, dryM3[1] - totalAltWasserM3)]
        : null;

    const pendingCount = project.fieldAssignments.filter((fa) => !fa.module).length;
    const totalAreaHa = project.fieldAssignments
        .reduce((sum, fa) => sum + (farm.fields.find((f) => f.id === fa.fieldId)?.areaHa ?? 0), 0);

    // Netto in mm/a: derived from m³/a ÷ (totalAreaHa × 10)
    const areaFactor = totalAreaHa > 0 ? totalAreaHa * 10 : null;
    const nettoMm: [number, number] | null = nettoM3 && areaFactor
        ? [Math.round(nettoM3[0] / areaFactor), Math.round(nettoM3[1] / areaFactor)]
        : null;
    const nettoDryMm: [number, number] | null = nettoDryM3 && areaFactor
        ? [Math.round(nettoDryM3[0] / areaFactor), Math.round(nettoDryM3[1] / areaFactor)]
        : null;

    return (
        <div className="page">
            {/* Header */}
            <button className="project-detail__back" onClick={() => navigate("/")}>
                ← Szenarien
            </button>
            <h1>{project.name}</h1>
            {project.year && (
                <span className="project-detail__meta">{project.year}</span>
            )}

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

                                    const normalHasValue = result?.normal && (!('hasValue' in result.normal) || result.normal.hasValue);
                                    const dryHasValue = result?.dry && (!('hasValue' in result.dry) || result.dry.hasValue);

                                    if (result) return (
                                        <div className="assignment-list__result">
                                            {normalHasValue && result.normal && (
                                                <span className="result-pill result-pill--normal">
                                                    🌤 {formatRange(result.normal.totalRangeMm, "mm/a")} · {formatRange(result.normal.totalRangeM3, "m³/a")}
                                                </span>
                                            )}
                                            {dryHasValue && result.dry && (
                                                <span className="result-pill result-pill--dry">
                                                    ☀️ {formatRange(result.dry.totalRangeMm, "mm/a")} · {formatRange(result.dry.totalRangeM3, "m³/a")}
                                                </span>
                                            )}
                                            {!normalHasValue && result.normal && (
                                                <span className="result-pill result-pill--pending">
                                                    Kein Literaturwert
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
                    <p className="project-detail__add-field-label">Schlag auswählen:</p>
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
                    <button onClick={() => setShowAddField(false)} className="project-detail__cancel-btn">
                        Abbrechen
                    </button>
                </div>
            ) : (
                <button onClick={() => setShowAddField(true)} className="project-detail__add-btn">
                    + Schlag hinzufügen
                </button>
            )}

            {/* Zusammenfassung */}
            {project.fieldAssignments.length > 0 && (
                <section className="project-summary">
                    <h2>Zusammenfassung</h2>

                    {/* Detailtabelle je Schlag */}
                    <details className="project-summary__details">
                        <summary>Details je Schlag</summary>
                        <div className="project-summary__table-wrap">
                            <table className="project-summary__table">
                                <thead>
                                    <tr>
                                        <th>Schlag</th>
                                        <th>Nutzung</th>
                                        <th>Fläche</th>
                                        <th>🌤 Normal</th>
                                        <th>☀️ Trocken</th>
                                        {totalAltWasserM3 > 0 && <th>Alt. Wasser</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {project.fieldAssignments.map((fa, i) => {
                                        const field = farm.fields.find((f) => f.id === fa.fieldId);
                                        if (!field) return null;
                                        const result = assignmentResults[i];
                                        return (
                                            <tr key={fa.id}>
                                                <td>
                                                    <strong>{field.name}</strong>
                                                    {fa.plantKey && (
                                                        <span className="project-summary__plant">
                                                            {fa.plantKey.split("|").slice(0, 2).join(" · ")}
                                                        </span>
                                                    )}
                                                </td>
                                                <td>{fa.module ? getModuleLabel(fa.module) : "–"}</td>
                                                <td>{field.areaHa} ha</td>
                                                <td>
                                                    {result?.normal && (!('hasValue' in result.normal) || result.normal.hasValue) ? (
                                                        <div className="project-summary__two-line">
                                                            <span>{formatRange(result.normal.totalRangeMm, "mm/a")}</span>
                                                            <span>{formatRange(result.normal.totalRangeM3, "m³/a")}</span>
                                                        </div>
                                                    ) : result?.normal ? "k. W." : "–"}
                                                </td>
                                                <td>
                                                    {result?.dry && (!('hasValue' in result.dry) || result.dry.hasValue) ? (
                                                        <div className="project-summary__two-line">
                                                            <span>{formatRange(result.dry.totalRangeMm, "mm/a")}</span>
                                                            <span>{formatRange(result.dry.totalRangeM3, "m³/a")}</span>
                                                        </div>
                                                    ) : result?.dry ? "k. W." : "–"}
                                                </td>
                                                {totalAltWasserM3 > 0 && (
                                                    <td>
                                                        {result?.altWasserM3
                                                            ? `${formatNum(result.altWasserM3, 0)} m³`
                                                            : "–"}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="project-summary__total-row">
                                        <td colSpan={2}><strong>Gesamt ({project.fieldAssignments.length} Schläge)</strong></td>
                                        <td>{formatNum(totalAreaHa, 1)} ha</td>
                                        <td>
                                            {normalM3 ? (
                                                <div className="project-summary__two-line">
                                                    {normalMm && <span>{formatRange(normalMm, "mm/a")}</span>}
                                                    <span>{formatRange(normalM3, "m³/a")}</span>
                                                </div>
                                            ) : "–"}
                                        </td>
                                        <td>
                                            {dryM3 ? (
                                                <div className="project-summary__two-line">
                                                    {dryMm && <span>{formatRange(dryMm, "mm/a")}</span>}
                                                    <span>{formatRange(dryM3, "m³/a")}</span>
                                                </div>
                                            ) : "–"}
                                        </td>
                                        {totalAltWasserM3 > 0 && (
                                            <td>{formatNum(totalAltWasserM3, 0)} m³</td>
                                        )}
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </details>

                    {/* Brutto / Alt. Wasser / Netto */}
                    {normalM3 && (
                        <div className="project-summary__row project-summary__row--result">
                            <span>
                                🌤 Brutto Normaljahr
                                {normalCount < assignedCount && <span className="project-summary__partial"> ({normalCount}/{assignedCount} Schläge)</span>}
                            </span>
                            <strong>{normalMm && `${formatRange(normalMm, "mm/a")} · `}{formatRange(normalM3, "m³/a")}</strong>
                        </div>
                    )}
                    {dryM3 && (
                        <div className="project-summary__row project-summary__row--result">
                            <span>
                                ☀️ Brutto Trockenjahr
                                {dryCount < assignedCount && <span className="project-summary__partial"> ({dryCount}/{assignedCount} Schläge)</span>}
                            </span>
                            <strong>{dryMm && `${formatRange(dryMm, "mm/a")} · `}{formatRange(dryM3, "m³/a")}</strong>
                        </div>
                    )}
                    {totalAltWasserM3 > 0 && (
                        <div className="project-summary__row project-summary__row--alt">
                            <span>− Alternative Wasserquellen</span>
                            <strong>{formatNum(totalAltWasserM3, 0)} m³/a</strong>
                        </div>
                    )}
                    {nettoM3 && totalAltWasserM3 > 0 && (
                        <div className="project-summary__row project-summary__row--netto">
                            <span>🌤 Netto-Antragsmenge (Normaljahr)</span>
                            <strong>{nettoMm && `${formatRange(nettoMm, "mm/a")} · `}{formatRange(nettoM3, "m³/a")}</strong>
                        </div>
                    )}
                    {nettoDryM3 && totalAltWasserM3 > 0 && (
                        <div className="project-summary__row project-summary__row--netto">
                            <span>☀️ Netto-Antragsmenge (Trockenjahr)</span>
                            <strong>{nettoDryMm && `${formatRange(nettoDryMm, "mm/a")} · `}{formatRange(nettoDryM3, "m³/a")}</strong>
                        </div>
                    )}
                    {pendingCount > 0 && (
                        <div className="project-summary__row project-summary__row--pending">
                            <span>⚠️ Ohne Nutzung</span>
                            <span>{pendingCount} Schlag/Schläge</span>
                        </div>
                    )}
                    {(normalCount < assignedCount || dryCount < assignedCount) && (
                        <div className="project-summary__row project-summary__row--footnote">
                            <span>
                                * Summe umfasst nicht alle Schläge
                                {normalCount < assignedCount && ` (Normaljahr: ${normalCount}/${assignedCount})`}
                                {dryCount < assignedCount && ` (Trockenjahr: ${dryCount}/${assignedCount})`}
                                {" – nicht alle Nutzungen liefern beide Szenariowerte. Netto-Antragsmenge wird nur bei vollständigen Szenarien ausgewiesen."}
                            </span>
                        </div>
                    )}

                </section>
            )}
            {project.fieldAssignments.length > 0 && (
                <button className="project-summary__print-btn" onClick={() => {
                    const filename = `${project.name}-zusammenfassung.pdf`;
                    Promise.all([
                        svgUrlToPngDataUrl(`${base}atb_logo.svg`, 48),
                        svgUrlToPngDataUrl(`${base}dwa-logo.svg`, 48),
                    ])
                    .then(([logoAtbDataUrl, logoDwaDataUrl]) => generateSummaryPdf({
                        project,
                        farm,
                        assignmentResults,
                        normalMm, normalM3, dryMm, dryM3,
                        totalAltWasserM3, nettoM3, nettoMm, nettoDryM3, nettoDryMm,
                        totalAreaHa,
                        pendingCount,
                        normalCount,
                        dryCount,
                        logoAtbDataUrl,
                        logoDwaDataUrl,
                        iconNormalDataUrl: emojiToPngDataUrl("🌤"),
                        iconDryDataUrl: emojiToPngDataUrl("☀️"),
                        createdDateStr: new Date().toLocaleDateString("de-DE"),
                    }, filename))
                    .then(file => sharePdf(file))
                    .catch(() => {
                        addMessage({type: "error", message: ["PDF konnte nicht erstellt werden."]});
                    });
                }}>
                    PDF Export
                </button>
            )}
        </div>
    );
};
