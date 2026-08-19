// src/pages/ProjectDetailPage.tsx
import {useState, useRef, useCallback, useEffect} from "react";
import {useNavigate, useParams} from "react-router";
import {OnboardingBanner} from "../components/OnboardingBanner";
import {DemoHint} from "../components/DemoHint";
import {InfoHint} from "../components/InfoHint";
import {getModuleLabel, fieldTerm, isSubAreaModule, hasDryYearScenario} from "../constants/modules";
import {useFarm} from "../hooks/useFarm";
import {useProjects} from "../hooks/useProjects";
import {getAssignmentResult, getMissingData, sumResults, type AssignmentResult} from "../lib/calculations/getAssignmentResult";
import {formatNum, formatRange} from "../lib/formatNum";
import {generateSummaryPdf, sharePdf} from "../lib/generateSummaryPdf";
import {svgUrlToPngDataUrl} from "../lib/svgToPngDataUrl";
import {ProjectForm} from "../components/ProjectForm";
import {useAppStore} from "../stores/useAppStore";
import {formatPeriod} from "../utils/irrigationPeriod";
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
                <BackButton onClick={() => navigate(-1)}>Zurück</BackButton>
            </div>
        );
    }

    // Fields that are NOT yet assigned
    const assignedFieldIds = new Set(project.fieldAssignments.map((fa) => fa.fieldId));
    const availableFields = farm.fields.filter((f) => !assignedFieldIds.has(f.id));

    const assignmentResults: (AssignmentResult | null)[] = project.fieldAssignments.map((fa) => {
        const field = farm.fields.find((f) => f.id === fa.fieldId);
        if (!field) return null;
        return getAssignmentResult(fa, field);
    });

    const {
        normalM3, dryM3, yearlyM3, yearlyCount, totalAltWasserM3,
        nettoM3: nettoM3Raw, nettoYearlyM3,
    } = sumResults(assignmentResults.filter((r): r is AssignmentResult => r !== null));

    // Completeness is judged per block: the scenario counts compare against the
    // crop assignments only, since the sport/green ones are not missing from a
    // scenario sum — they were never part of it (see hasDryYearScenario).
    const scenarioResults = assignmentResults.filter(r => r && hasDryYearScenario(r.module));
    const normalCount = scenarioResults.filter(r =>
        r?.normal && (!("hasValue" in r.normal) || r.normal.hasValue)
    ).length;
    const dryCount = scenarioResults.filter(r =>
        r?.dry && (!("hasValue" in r.dry) || r.dry.hasValue)
    ).length;
    const scenarioAssignedCount = project.fieldAssignments
        .filter(fa => fa.module && hasDryYearScenario(fa.module)).length;
    const yearlyAssignedCount = project.fieldAssignments
        .filter(fa => fa.module && !hasDryYearScenario(fa.module)).length;

    // Adapt the terminology to the project context: pure sport/golf projects
    // say "Fläche" (area) instead of "Schlag"/"Feld" (field).
    const projectModules = project.fieldAssignments.map((fa) => fa.module);
    const term = fieldTerm(projectModules);
    const termPlural = fieldTerm(projectModules, true);
    const hasSubAreaModule = projectModules.some(isSubAreaModule);

    // Only show netto deduction when ALL crop assignments contribute to that scenario
    const nettoM3: [number, number] | null = normalCount === scenarioAssignedCount ? nettoM3Raw : null;
    const cropAltWasserM3 = assignmentResults.reduce(
        (sum, r) => sum + (r && hasDryYearScenario(r.module) ? r.altWasserM3 ?? 0 : 0), 0);
    const nettoDryM3: [number, number] | null = dryM3 && cropAltWasserM3 > 0 && dryCount === scenarioAssignedCount
        ? [Math.max(0, dryM3[0] - cropAltWasserM3), Math.max(0, dryM3[1] - cropAltWasserM3)]
        : null;

    const pendingCount = project.fieldAssignments.filter((fa) => !fa.module).length;
    const totalAreaHa = project.fieldAssignments
        .reduce((sum, fa) => sum + (farm.fields.find((f) => f.id === fa.fieldId)?.areaHa ?? 0), 0);

    // No mm/a on the totals rows. A project total in mm/a would divide the summed m³/a
    // by the summed area, but the per-assignment mm/a values are not all referenced to
    // the field area: golf reports mm/a over its irrigated sub-areas (greens/tees/
    // fairways, TABLE_35), which are much smaller than the field. Mixing the two
    // denominators made the total look smaller than every single row (tester feedback
    // 2026-08-07, app/doc/feedback/2026-08-07-sabine-heumann.md). m³/a is the figure
    // the Antragsmenge is based on and sums without ambiguity, so the totals show only
    // that; per-assignment mm/a stays visible in each row and on the result cards.

    return (
        <div className="page">
            {/* Header */}
            <BackButton onClick={() => navigate(-1)}>Szenarien</BackButton>
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
            {project.isDemo && <DemoHint variant="project" />}

            {/* Field/area assignments */}
            <h2>{term === 'Feld' ? 'Feldzuweisungen' : 'Flächenzuweisungen'}</h2>

            {project.fieldAssignments.length === 0 && (
                <p className="project-detail__empty">
                    Noch keine {termPlural} zugewiesen. Fügen Sie mit „+ {term} hinzufügen“ {term === 'Feld' ? 'ein Feld' : 'eine Fläche'} hinzu und weisen Sie ihm eine Nutzung zu.
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
                                data-tour={i === 0 ? "assignment-row" : undefined}
                                onClick={() => navigate(`/projects/${project.id}/assignment/${fa.id}`)}
                            >
                                {/* Row 1: field name; area + zone float top-right so a long
                                    name wraps beneath them and uses the full width. */}
                                <div className="assignment-list__field">
                                    <span className="assignment-list__meta">
                                        <span className="assignment-list__area">{formatNum(field.areaHa, 2)}&nbsp;ha</span>
                                        {field.climateClassStatus === "done" && field.climateClass && (
                                            <span className="assignment-list__climate">🌿&nbsp;{field.climateClass[0]}</span>
                                        )}
                                    </span>
                                    <strong>{field.name}</strong>
                                </div>

                                {/* Row 2: module + plant – unchanged */}
                                <div className="assignment-list__module">
                                    {fa.module
                                        ? <span className="module-badge module-badge--set">{getModuleLabel(fa.module)}</span>
                                        : <span className="module-badge module-badge--empty">Nutzung wählen ➔</span>
                                    }
                                    {fa.plantKey && (
                                        <span
                                            className="assignment-list__plant"
                                            title={fa.plantKey.split("|").slice(0, 2).join(" · ")}
                                        >
                                            {fa.plantKey.split("|").slice(0, 2).join(" · ")}
                                        </span>
                                    )}
                                </div>

                                {/* Row 3: irrigation period – unchanged */}
                                {fa.irrigationPeriod && (
                                    <div className="assignment-list__period">
                                        📅 {formatPeriod(fa.irrigationPeriod)}
                                    </div>
                                )}

                                {/* Row 4: calculation result – new */}
                                {(() => {
                                    const result = assignmentResults[i];
                                    const missing = result === null && fa.module
                                        ? getMissingData(fa, field)
                                        : [];

                                    const normalHasValue = result?.normal && (!('hasValue' in result.normal) || result.normal.hasValue);
                                    const dryHasValue = result?.dry && (!('hasValue' in result.dry) || result.dry.hasValue);

                                    // Self-healing lookups: if only climate/climate data is not yet
                                    // loaded, we show "wird ermittelt…" (being determined) instead of an error/link list.
                                    const climateLoading = !result && fa.module && (
                                        field.climateClassStatus === "loading" ||
                                        field.climateClassStatus === "idle" ||
                                        field.climateDataStatus === "loading" ||
                                        field.climateDataStatus === "idle"
                                    );

                                    if (result) return (
                                        <div className="assignment-list__result">
                                            {/* Sport/green: the value is a Jahresrichtwert, so it
                                                gets the neutral pill rather than the Normaljahr one. */}
                                            {normalHasValue && result.normal && (
                                                hasDryYearScenario(result.module) ? (
                                                    <span className="result-pill result-pill--normal">
                                                        🌤 {formatRange(result.normal.totalRangeM3, "m³/a")} · {formatRange(result.normal.totalRangeMm, "mm/a")}
                                                    </span>
                                                ) : (
                                                    <span className="result-pill result-pill--yearly" title="Jahresrichtwert – das Merkblatt unterscheidet hier nicht zwischen Normal- und Trockenjahr">
                                                        📅 {formatRange(result.normal.totalRangeM3, "m³/a")} · {formatRange(result.normal.totalRangeMm, "mm/a")}
                                                    </span>
                                                )
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
                                        // Field-level deficiencies are fixed on the farm page (?edit=<id>),
                                        // module/plant/options on the assignment page.
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
                                                            {m} ➔
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
                                    <strong>Zuweisung „{field.name}“ entfernen?</strong>
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

            {/* Add field/area */}
            <div data-tour="add-assignment">
            {showAddField ? (
                <div className="project-detail__add-field">
                    <p className="project-detail__add-field-label">{term} auswählen:</p>
                    {availableFields.length === 0 ? (
                        <p className="project-detail__empty">
                            Alle {termPlural} bereits zugewiesen.{" "}
                            <button className="link-btn" onClick={() => navigate("/farm")}>
                                Neue {termPlural} anlegen ➔
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
                                    <span>{formatNum(field.areaHa, 2)}&nbsp;ha</span>
                                    {field.climateClassStatus === "done" && field.climateClass && (
                                        <span className="assignment-list__climate">🌿&nbsp;{field.climateClass[0]}</span>
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
                    + {term} hinzufügen
                </button>
            )}
            </div>

            {/* Summary */}
            {project.fieldAssignments.length > 0 && (
                // The Rundgang (tour) target wraps the summary AND the PDF export button
                // (the button is a sibling of the <section>) – otherwise it would stay outside
                // the spotlight in the last step "Zusammenfassung & PDF" (summary & PDF).
                <div data-tour="project-summary" className="project-summary-tour-wrap">
                <section className="project-summary">
                    <h2>Zusammenfassung</h2>

                    {/* Detail table per field/area */}
                    <details className="project-summary__details">
                        <summary>Details je {term}</summary>
                        <div className="project-summary__table-wrap-outer" ref={tableOuterRef}>
                        <div
                            className="project-summary__table-wrap"
                            ref={tableScrollCallbackRef}
                            onScroll={updateScrollShadows}
                        >
                            <table className="project-summary__table">
                                <thead>
                                    <tr>
                                        <th>{term}</th>
                                        <th>Nutzung</th>
                                        <th>Fläche</th>
                                        <th>Normal</th>
                                        <th>Trocken</th>
                                        {totalAltWasserM3 > 0 && <th>Alt. Wasser</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {project.fieldAssignments.map((fa, i) => {
                                        const field = farm.fields.find((f) => f.id === fa.fieldId);
                                        if (!field) return null;
                                        const result = assignmentResults[i];
                                        // Sport/green rows have one Jahresrichtwert instead of
                                        // two scenario values — span it across both scenario
                                        // columns rather than printing it under "Normal" with
                                        // a dash under "Trocken", which read as a missing value.
                                        const scenarioFree = !!fa.module && !hasDryYearScenario(fa.module);
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
                                                {scenarioFree ? (
                                                    <td colSpan={2} className="project-summary__yearly-cell">
                                                        {result?.normal && (!('hasValue' in result.normal) || result.normal.hasValue) ? (
                                                            <div className="project-summary__two-line">
                                                                <span>{formatRange(result.normal.totalRangeM3, "m³/a")}</span>
                                                                <span>
                                                                    {formatRange(result.normal.totalRangeMm, "mm/a")}
                                                                    {isSubAreaModule(fa.module) && <sup>†</sup>}
                                                                </span>
                                                                <span className="project-summary__yearly-note">
                                                                    Jahresrichtwert<sup>‡</sup>
                                                                </span>
                                                            </div>
                                                        ) : result?.normal ? "k. W." : "–"}
                                                    </td>
                                                ) : (
                                                <>
                                                <td>
                                                    {result?.normal && (!('hasValue' in result.normal) || result.normal.hasValue) ? (
                                                        <div className="project-summary__two-line">
                                                            <span>{formatRange(result.normal.totalRangeM3, "m³/a")}</span>
                                                            <span>
                                                                {formatRange(result.normal.totalRangeMm, "mm/a")}
                                                                {isSubAreaModule(fa.module) && <sup>†</sup>}
                                                            </span>
                                                        </div>
                                                    ) : result?.normal ? "k. W." : "–"}
                                                </td>
                                                <td>
                                                    {result?.dry && (!('hasValue' in result.dry) || result.dry.hasValue) ? (
                                                        <div className="project-summary__two-line">
                                                            <span>{formatRange(result.dry.totalRangeM3, "m³/a")}</span>
                                                            <span>
                                                                {formatRange(result.dry.totalRangeMm, "mm/a")}
                                                                {isSubAreaModule(fa.module) && <sup>†</sup>}
                                                            </span>
                                                        </div>
                                                    ) : result?.dry ? "k. W." : "–"}
                                                </td>
                                                </>
                                                )}
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
                                        <td colSpan={2}><strong>Gesamt ({project.fieldAssignments.length} {termPlural})</strong></td>
                                        <td><strong>{formatNum(totalAreaHa, 2)} ha</strong></td>
                                        {/* The scenario columns total the crop rows only;
                                            the Jahresrichtwert rows are summed in their own
                                            line below the table, not into a scenario. */}
                                        <td>
                                            {normalM3 ? formatRange(normalM3, "m³/a") : "–"}
                                        </td>
                                        <td>
                                            {dryM3 ? formatRange(dryM3, "m³/a") : "–"}
                                        </td>
                                        {totalAltWasserM3 > 0 && (
                                            <td><strong>−{formatNum(totalAltWasserM3, 0)} m³/a</strong></td>
                                        )}
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        </div>
                        {/* Footnotes sit OUTSIDE __table-wrap-outer: that wrapper carries the
                            horizontal scroll shadows as full-height ::before/::after overlays,
                            so anything inside it gets the gradient painted over it even though
                            only the table scrolls. */}
                        {hasSubAreaModule && (
                            <p className="project-summary__table-footnote">
                                † Beim Golfplatz bezieht sich der mm/a-Wert auf die
                                bewässerten Teilflächen (Grüns, Abschläge, Fairways),
                                nicht auf die gesamte Flächengröße. Die m³/a-Werte sind
                                bei allen Nutzungen direkt vergleichbar und werden
                                aufsummiert.
                            </p>
                        )}
                        {yearlyM3 && (
                            <p className="project-summary__table-footnote">
                                ‡ Für Sport-, Grün- und Golfflächen nennt das Merkblatt
                                einen einzelnen Jahresrichtwert und unterscheidet nicht
                                zwischen Normal- und Trockenjahr. Diese Flächen werden
                                deshalb getrennt summiert und nicht in die
                                Szenariosummen eingerechnet.
                            </p>
                        )}
                    </details>

                    {/* Brutto (gross) / Alt. Wasser / Netto (net).
                        Three blocks, each rendered only when it has a value: the two
                        scenario sums over the crop areas, and the scenario-free sum over
                        the sport/green areas. A pure agricultural project therefore never
                        sees the Jahresrichtwert block, a pure golf project never sees the
                        scenario rows. */}
                    {normalM3 && (
                        <div className="project-summary__row project-summary__row--result">
                            <span>
                                Brutto Normaljahr
                                {normalCount < scenarioAssignedCount && <span className="project-summary__partial"> * ({normalCount}/{scenarioAssignedCount} {termPlural})</span>}
                            </span>
                            <span className="project-summary__result-value">
                                <strong>{formatRange(normalM3, "m³/a")}</strong>
                            </span>
                        </div>
                    )}
                    {dryM3 && (
                        <div className="project-summary__row project-summary__row--result">
                            <span>
                                Brutto Trockenjahr
                                {dryCount < scenarioAssignedCount && <span className="project-summary__partial"> * ({dryCount}/{scenarioAssignedCount} {termPlural})</span>}
                            </span>
                            <span className="project-summary__result-value">
                                <strong>{formatRange(dryM3, "m³/a")}</strong>
                            </span>
                        </div>
                    )}
                    {yearlyM3 && (
                        <div className="project-summary__row project-summary__row--result project-summary__row--yearly">
                            <span>
                                Brutto Jahresrichtwert
                                <span className="project-summary__partial">
                                    {" "}({yearlyCount === yearlyAssignedCount
                                        ? `${yearlyCount} ${yearlyCount === 1 ? "Sport-/Grünfläche" : "Sport-/Grünflächen"}`
                                        : `${yearlyCount}/${yearlyAssignedCount} Sport-/Grünflächen`})
                                </span>
                            </span>
                            <span className="project-summary__result-value">
                                <strong>{formatRange(yearlyM3, "m³/a")}</strong>
                            </span>
                        </div>
                    )}
                    {yearlyM3 && (
                        <div className="project-summary__row project-summary__row--footnote">
                            <span>
                                Sport-, Grün- und Golfflächen werden{" "}
                                <strong>getrennt ausgewiesen</strong> und in keiner der
                                beiden Szenariosummen mitgezählt: das Merkblatt bemisst sie
                                nach Fläche, Niederschlag und Verdunstung und nennt dafür
                                einen einzelnen Jahresrichtwert – einen Wert für das
                                mittlere Trockenjahr gibt es dort nicht. Für den Antrag
                                sind die Beträge zu addieren; welches Szenario Sie für die
                                Kulturflächen ansetzen, bleibt Ihre Entscheidung.
                            </span>
                        </div>
                    )}
                    {totalAltWasserM3 > 0 && (
                        <div className="project-summary__row project-summary__row--alt">
                            <span>Alternative Wasserquellen</span>
                            <strong>−{formatNum(totalAltWasserM3, 0)} m³/a</strong>
                        </div>
                    )}
                    {nettoM3 && cropAltWasserM3 > 0 && (
                        <div className="project-summary__row project-summary__row--netto">
                            <span>Netto-Antragsmenge (Normaljahr)</span>
                            <span className="project-summary__result-value">
                                <strong>{formatRange(nettoM3, "m³/a")}</strong>
                            </span>
                        </div>
                    )}
                    {nettoDryM3 && cropAltWasserM3 > 0 && (
                        <div className="project-summary__row project-summary__row--netto">
                            <span>Netto-Antragsmenge (Trockenjahr)</span>
                            <span className="project-summary__result-value">
                                <strong>{formatRange(nettoDryM3, "m³/a")}</strong>
                            </span>
                        </div>
                    )}
                    {nettoYearlyM3 && totalAltWasserM3 - cropAltWasserM3 > 0 && (
                        <div className="project-summary__row project-summary__row--netto">
                            <span>Netto-Antragsmenge (Sport-/Grünflächen)</span>
                            <span className="project-summary__result-value">
                                <strong>{formatRange(nettoYearlyM3, "m³/a")}</strong>
                            </span>
                        </div>
                    )}
                    {pendingCount > 0 && (
                        <div className="project-summary__row project-summary__row--pending">
                            <span>⚠️ Ohne Nutzung</span>
                            <span>{pendingCount} {pendingCount === 1 ? term : termPlural}</span>
                        </div>
                    )}
                    {(normalCount < scenarioAssignedCount || dryCount < scenarioAssignedCount) && (
                        <div className="project-summary__row project-summary__row--footnote">
                            <span>
                                * Summe umfasst nicht alle Kulturflächen
                                {normalCount < scenarioAssignedCount && ` (Normaljahr: ${normalCount}/${scenarioAssignedCount})`}
                                {dryCount < scenarioAssignedCount && ` (Trockenjahr: ${dryCount}/${scenarioAssignedCount})`}
                                {" – für einzelne Kulturen liegt kein Literaturwert vor."}
                                {cropAltWasserM3 > 0 && " Netto-Antragsmenge wird nur bei vollständigen Szenarien ausgewiesen."}
                            </span>
                        </div>
                    )}

                    <InfoHint summary="Normaljahr oder Trockenjahr – was gilt für mich?">
                        Beide Werte werden immer berechnet; Sie müssen sich nicht vorab
                        entscheiden.
                        <br /><br />
                        Das <strong>Normaljahr</strong> ist der Median einer 30-jährigen Reihe
                        der klimatischen Wasserbilanz (KWBv) und entspricht einer 50%igen
                        Versorgungssicherheit: statistisch kann in 5 von 10 Jahren der aktuelle
                        Bedarf nicht vollständig gedeckt werden. Das{" "}
                        <strong>mittlere Trockenjahr</strong> ist das 20%-Perzentil derselben
                        Reihe und entspricht 80% Versorgungssicherheit – nur 2 von 10 Jahren
                        sind so trocken, dass der Bedarf nicht gedeckt wird (Kapitel 3.5).
                        <br /><br />
                        Als Bemessungsgrundlage für wasserrechtliche Gestattungen{" "}
                        <strong>empfiehlt das Merkblatt das mittlere Trockenjahr</strong>. Dazu
                        wird angeregt, in der Gestattung ein Überschreiten um bis zu 25% in
                        einzelnen Jahren zuzulassen, solange das Mittel im gleitenden
                        5-Jahres-Zeitraum die Menge für das mittlere Trockenjahr nicht
                        übersteigt (Kapitel 3.5).
                        <br /><br />
                        Hinweis: Nur die Kulturmodule (Hauptkulturen, Gemüse/{'​'}Obst,
                        Weinbau) liefern einen Trockenjahr-Wert; Sport- und Grünflächen werden
                        nach Fläche und Niederschlag bemessen und kennen kein Trockenjahr.
                        Ihr Bedarf wird daher <strong>getrennt als Jahresrichtwert
                        ausgewiesen</strong> und nicht in die beiden Szenariosummen
                        eingerechnet – sonst stünde er unter „Normaljahr“, obwohl er keines
                        ist, und fehlte im Trockenjahr ganz. Für die Antragsmenge addieren
                        Sie den Jahresrichtwert zu dem Szenario, das Sie für die
                        Kulturflächen ansetzen.
                    </InfoHint>

                </section>
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
                        normalM3, dryM3,
                        yearlyM3, yearlyCount, yearlyAssignedCount,
                        totalAltWasserM3, nettoM3, nettoDryM3, nettoYearlyM3,
                        totalAreaHa,
                        pendingCount,
                        normalCount,
                        dryCount,
                        scenarioAssignedCount,
                        logoAtbDataUrl,
                        logoDwaDataUrl,
                        createdDateStr: new Date().toLocaleDateString("de-DE"),
                    }, filename))
                    .then(file => sharePdf(file))
                    .catch(() => {
                        addMessage({type: "error", message: ["PDF konnte nicht erstellt werden."]});
                    });
                }}>
                    PDF Export
                </button>
                </div>
            )}
        </div>
    );
};
