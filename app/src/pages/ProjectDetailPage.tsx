// src/pages/ProjectDetailPage.tsx
import {useState, useRef, useCallback, useEffect} from "react";
import {useNavigate, useParams} from "react-router";
import {OnboardingBanner} from "../components/OnboardingBanner";
import {getModuleLabel} from "../constants/modules";
import {useFarm} from "../hooks/useFarm";
import {useProjects} from "../hooks/useProjects";
import {getAssignmentResult, getMissingData, sumResults, type AssignmentResult} from "../lib/calculations/getAssignmentResult";
import {formatNum, formatRange} from "../lib/formatNum";
import {generateSummaryPdf, sharePdf} from "../lib/generateSummaryPdf";
import {emojiToPngDataUrl, svgUrlToPngDataUrl} from "../lib/svgToPngDataUrl";
import {ProjectForm} from "../components/ProjectForm";
import {useAppStore} from "../stores/useAppStore";
import {boundToLabel} from "../utils/irrigationPeriod";
import {BackButton} from "../components/BackButton";
import "./ProjectDetailPage.scss";

const base = import.meta.env.BASE_URL;

export const ProjectDetailPage = () => {
    const {id} = useParams<{id: string;}>();
    const navigate = useNavigate();
    const {projects, addFieldAssignment, removeFieldAssignment, updateProject} = useProjects();
    const {farm} = useFarm();

    const [showAddField, setShowAddField] = useState(false);
    const [showEditProject, setShowEditProject] = useState(false);
    const [confirmDeleteAssignmentId, setConfirmDeleteAssignmentId] = useState<string | null>(null);
    const deleteConfirmRef = useRef<HTMLDivElement>(null);
    const addMessage = useAppStore((s) => s.addMessage);

    useEffect(() => {
        if (!confirmDeleteAssignmentId) return;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                deleteConfirmRef.current?.scrollIntoView({behavior: "smooth", block: "center"});
            });
        });
    }, [confirmDeleteAssignmentId]);

    const tableScrollRef = useRef<HTMLDivElement>(null);
    const tableOuterRef = useRef<HTMLDivElement>(null);
    const updateScrollShadows = useCallback(() => {
        const scroll = tableScrollRef.current;
        const outer = tableOuterRef.current;
        if (!scroll || !outer) return;
        outer.classList.toggle("project-summary__table-wrap-outer--shadow-left", scroll.scrollLeft > 0);
        outer.classList.toggle("project-summary__table-wrap-outer--shadow-right", scroll.scrollLeft + scroll.clientWidth < scroll.scrollWidth - 1);
    }, []);
    const tableScrollCallbackRef = useCallback((el: HTMLDivElement | null) => {
        tableScrollRef.current = el;
    }, []);
    useEffect(() => {
        const el = tableScrollRef.current;
        if (!el) return;
        const ro = new ResizeObserver(updateScrollShadows);
        ro.observe(el);
        return () => ro.disconnect();
    }, [updateScrollShadows]);

    const project = projects.find((p) => p.id === id);

    if (!project) {
        return (
            <div className="page">
                <p>Szenario nicht gefunden.</p>
                <BackButton onClick={() => navigate("/")}>Zurück</BackButton>
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

    const {normalM3, normalAreaHa, dryM3, dryAreaHa, totalAltWasserM3, nettoM3: nettoM3Raw} = sumResults(
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

    // mm/a totals: derived from m³/a ÷ (contributing area × 10) — summing mm/a across fields is meaningless
    const normalMm: [number, number] | null = normalM3 && normalAreaHa > 0
        ? [Math.round(normalM3[0] / (normalAreaHa * 10)), Math.round(normalM3[1] / (normalAreaHa * 10))]
        : null;
    const dryMm: [number, number] | null = dryM3 && dryAreaHa > 0
        ? [Math.round(dryM3[0] / (dryAreaHa * 10)), Math.round(dryM3[1] / (dryAreaHa * 10))]
        : null;
    const nettoMm: [number, number] | null = nettoM3 && normalAreaHa > 0
        ? [Math.round(nettoM3[0] / (normalAreaHa * 10)), Math.round(nettoM3[1] / (normalAreaHa * 10))]
        : null;
    const nettoDryMm: [number, number] | null = nettoDryM3 && dryAreaHa > 0
        ? [Math.round(nettoDryM3[0] / (dryAreaHa * 10)), Math.round(nettoDryM3[1] / (dryAreaHa * 10))]
        : null;

    return (
        <div className="page">
            {/* Header */}
            <BackButton onClick={() => navigate("/")}>Szenarien</BackButton>
            {showEditProject ? (
                <ProjectForm
                    initialName={project.name}
                    initialDescription={project.description ?? ""}
                    submitLabel="Speichern"
                    onSave={(name, description) => {
                        updateProject(project.id, {name, description});
                        setShowEditProject(false);
                    }}
                    onCancel={() => setShowEditProject(false)}
                />
            ) : (
                <>
                    <div className="project-detail__title-row">
                        <h1>{project.name}</h1>
                        <button className="project-detail__edit-btn" onClick={() => setShowEditProject(true)} title="Name/Beschreibung bearbeiten">✏️</button>
                    </div>
                    {project.description && (
                        <p className="project-detail__description">
                            {project.description.split("\n").map((line, i, arr) => (
                                <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
                            ))}
                        </p>
                    )}
                </>
            )}

            <OnboardingBanner />

            {/* Feldzuweisungen */}
            <h2>Feldzuweisungen</h2>

            {project.fieldAssignments.length === 0 && (
                <p className="project-detail__empty">
                    Noch keine Felder zugewiesen. Fügen Sie mit „+ Schlag hinzufügen" einen Schlag hinzu und weisen Sie ihm eine Nutzung zu.
                </p>
            )}

            <ul className="assignment-list">
                {project.fieldAssignments.map((fa, i) => {
                    const field = farm.fields.find((f) => f.id === fa.fieldId);
                    if (!field) return null;

                    return (
                        <li key={fa.id} className="assignment-list__item-wrap">
                            <div className="assignment-list__item">
                            <div
                                className="assignment-list__main"
                                onClick={() => navigate(`/projects/${project.id}/assignment/${fa.id}`)}
                            >
                                {/* Zeile 1: Feldname + Fläche + Klimazone – unverändert */}
                                <div className="assignment-list__field">
                                    <strong>{field.name}</strong>
                                    <span>{formatNum(field.areaHa, 2)} ha</span>
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

                                    // Selbstheilende Lookups: wenn nur Klima/Klimadaten gerade noch nicht
                                    // geladen sind, zeigen wir „wird ermittelt…" statt einer Fehler-/Link-Liste.
                                    const climateLoading = !result && fa.module && (
                                        field.climateClassStatus === "loading" ||
                                        field.climateClassStatus === "idle" ||
                                        field.climateDataStatus === "loading" ||
                                        field.climateDataStatus === "idle"
                                    );

                                    if (result) return (
                                        <div className="assignment-list__result">
                                            {normalHasValue && result.normal && (
                                                <span className="result-pill result-pill--normal">
                                                    🌤 {formatRange(result.normal.totalRangeM3, "m³/a")} · {formatRange(result.normal.totalRangeMm, "mm/a")}
                                                </span>
                                            )}
                                            {dryHasValue && result.dry && (
                                                <span className="result-pill result-pill--dry">
                                                    ☀️ {formatRange(result.dry.totalRangeM3, "m³/a")} · {formatRange(result.dry.totalRangeMm, "mm/a")}
                                                </span>
                                            )}
                                            {!normalHasValue && result.normal && (
                                                <span className="result-pill result-pill--pending">
                                                    Kein Literaturwert
                                                </span>
                                            )}
                                        </div>
                                    );

                                    if (climateLoading && missing.length === 0) {
                                        return (
                                            <div className="assignment-list__result">
                                                <span className="result-pill result-pill--pending">
                                                    ⏳ Klimazone / Klimadaten werden ermittelt…
                                                </span>
                                            </div>
                                        );
                                    }

                                    if (missing.length > 0) {
                                        // Field-level Mängel werden auf Farm-Seite behoben (?edit=<id>),
                                        // Modul-/Plant-/Optionen auf der Zuweisungs-Seite.
                                        const isFieldLevel = (m: string) =>
                                            m.startsWith("Klimazone") || m.startsWith("Klimadaten") || m === "nFKWe-Klasse";
                                        return (
                                            <div className="assignment-list__result">
                                                <span className="result-pill result-pill--pending">⚠️ Fehlt:</span>
                                                {missing.map((m) => {
                                                    const isField = isFieldLevel(m);
                                                    const target = isField
                                                        ? `/farm?edit=${field.id}`
                                                        : `/projects/${project.id}/assignment/${fa.id}`;
                                                    return (
                                                        <button
                                                            key={m}
                                                            type="button"
                                                            className="result-pill result-pill--pending result-pill--link"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(target);
                                                            }}
                                                            title={isField ? "Auf Farm-Seite bearbeiten" : "In Zuweisung öffnen"}
                                                        >
                                                            {m} →
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        );
                                    }

                                    return null;
                                })()}
                            </div>

                            <button
                                className="assignment-list__delete"
                                onClick={() => setConfirmDeleteAssignmentId(fa.id)}
                                title="Zuweisung entfernen"
                            >🗑</button>
                            </div>
                            {confirmDeleteAssignmentId === fa.id && (
                                <div ref={deleteConfirmRef} className="assignment-list__delete-confirm">
                                    <strong>Zuweisung „{field.name}" entfernen?</strong>
                                    <p>Die Zuweisung wird aus diesem Szenario entfernt.</p>
                                    <div className="assignment-list__delete-confirm-actions">
                                        <button
                                            className="assignment-list__delete-confirm-btn"
                                            onClick={() => {
                                                removeFieldAssignment(project.id, fa.id);
                                                setConfirmDeleteAssignmentId(null);
                                            }}
                                        >
                                            Ja, entfernen
                                        </button>
                                        <button onClick={() => setConfirmDeleteAssignmentId(null)}>Abbrechen</button>
                                    </div>
                                </div>
                            )}
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
                                    <span>{formatNum(field.areaHa, 2)} ha</span>
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
                        <div className="project-summary__table-wrap-outer" ref={tableOuterRef}>
                        <div
                            className="project-summary__table-wrap"
                            ref={tableScrollCallbackRef}
                            onScroll={updateScrollShadows}
                        >
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
                                                </td>
                                                <td>
                                                    {fa.module ? getModuleLabel(fa.module) : "–"}
                                                    {fa.plantKey && (
                                                        <span className="project-summary__plant">
                                                            {fa.plantKey.split("|").slice(0, 2).join(" · ")}
                                                        </span>
                                                    )}
                                                </td>
                                                <td>{formatNum(field.areaHa, 2)} ha</td>
                                                <td>
                                                    {result?.normal && (!('hasValue' in result.normal) || result.normal.hasValue) ? (
                                                        <div className="project-summary__two-line">
                                                            <span>{formatRange(result.normal.totalRangeM3, "m³/a")}</span>
                                                            <span>{formatRange(result.normal.totalRangeMm, "mm/a")}</span>
                                                        </div>
                                                    ) : result?.normal ? "k. W." : "–"}
                                                </td>
                                                <td>
                                                    {result?.dry && (!('hasValue' in result.dry) || result.dry.hasValue) ? (
                                                        <div className="project-summary__two-line">
                                                            <span>{formatRange(result.dry.totalRangeM3, "m³/a")}</span>
                                                            <span>{formatRange(result.dry.totalRangeMm, "mm/a")}</span>
                                                        </div>
                                                    ) : result?.dry ? "k. W." : "–"}
                                                </td>
                                                {totalAltWasserM3 > 0 && (
                                                    <td>
                                                        {result?.altWasserM3
                                                            ? `−${formatNum(result.altWasserM3, 0)} m³/a`
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
                                        <td><strong>{formatNum(totalAreaHa, 2)} ha</strong></td>
                                        <td>
                                            {normalM3 ? (
                                                <div className="project-summary__two-line">
                                                    <span>{formatRange(normalM3, "m³/a")}</span>
                                                    {normalMm && <span>{formatRange(normalMm, "mm/a")}</span>}
                                                </div>
                                            ) : "–"}
                                        </td>
                                        <td>
                                            {dryM3 ? (
                                                <div className="project-summary__two-line">
                                                    <span>{formatRange(dryM3, "m³/a")}</span>
                                                    {dryMm && <span>{formatRange(dryMm, "mm/a")}</span>}
                                                </div>
                                            ) : "–"}
                                        </td>
                                        {totalAltWasserM3 > 0 && (
                                            <td><strong>−{formatNum(totalAltWasserM3, 0)} m³/a</strong></td>
                                        )}
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        </div>
                    </details>

                    {/* Brutto / Alt. Wasser / Netto */}
                    {normalM3 && (
                        <div className="project-summary__row project-summary__row--result">
                            <span>
                                🌤 Brutto Normaljahr
                                {normalCount < assignedCount && <span className="project-summary__partial"> * ({normalCount}/{assignedCount} Schläge)</span>}
                            </span>
                            <span className="project-summary__result-value">
                                <strong>{formatRange(normalM3, "m³/a")}</strong>
                                {normalMm && <span className="project-summary__mma">{formatRange(normalMm, "mm/a")}</span>}
                            </span>
                        </div>
                    )}
                    {dryM3 && (
                        <div className="project-summary__row project-summary__row--result">
                            <span>
                                ☀️ Brutto Trockenjahr
                                {dryCount < assignedCount && <span className="project-summary__partial"> * ({dryCount}/{assignedCount} Schläge)</span>}
                            </span>
                            <span className="project-summary__result-value">
                                <strong>{formatRange(dryM3, "m³/a")}</strong>
                                {dryMm && <span className="project-summary__mma">{formatRange(dryMm, "mm/a")}</span>}
                            </span>
                        </div>
                    )}
                    {totalAltWasserM3 > 0 && (
                        <div className="project-summary__row project-summary__row--alt">
                            <span>💧 Alternative Wasserquellen</span>
                            <strong>−{formatNum(totalAltWasserM3, 0)} m³/a</strong>
                        </div>
                    )}
                    {nettoM3 && totalAltWasserM3 > 0 && (
                        <div className="project-summary__row project-summary__row--netto">
                            <span>🌤 Netto-Antragsmenge (Normaljahr)</span>
                            <span className="project-summary__result-value">
                                <strong>{formatRange(nettoM3, "m³/a")}</strong>
                                {nettoMm && <span className="project-summary__mma">{formatRange(nettoMm, "mm/a")}</span>}
                            </span>
                        </div>
                    )}
                    {nettoDryM3 && totalAltWasserM3 > 0 && (
                        <div className="project-summary__row project-summary__row--netto">
                            <span>☀️ Netto-Antragsmenge (Trockenjahr)</span>
                            <span className="project-summary__result-value">
                                <strong>{formatRange(nettoDryM3, "m³/a")}</strong>
                                {nettoDryMm && <span className="project-summary__mma">{formatRange(nettoDryMm, "mm/a")}</span>}
                            </span>
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
                        iconAltWasserDataUrl: emojiToPngDataUrl("💧"),
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
