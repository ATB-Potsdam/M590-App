// src/pages/FarmPage.tsx
import clsx from "clsx";
import type {ChangeEvent} from "react";
import {useEffect, useRef, useState} from "react";
import {useSearchParams} from "react-router";
import {ClimateBarChart} from "../components/ClimateBarChart";
import {FieldForm} from "../components/FieldForm";
import {OnboardingBanner} from "../components/OnboardingBanner";
import {InfoHint} from "../components/InfoHint";
import {DemoHint} from "../components/DemoHint";
import {seedDemoData} from "../lib/demoData";
import {refreshClimateData, useFarm} from "../hooks/useFarm";
import {useProjects} from "../hooks/useProjects";
import {exportData, parseImportFile} from "../lib/exportImport";
import {formatNum} from "../lib/formatNum";
import {useAppStore} from "../stores/useAppStore";
import {sanitize, useLocalStore} from "../stores/useLocalStore";
import type {Farm, Field} from "../types/farm";
import type {Project} from "../types/project";
import "./FarmPage.scss";

const ClimateClassBadge = ({field}: {field: Field;}) => {
    switch (field.climateClassStatus) {
        case "loading":
            return <span className="farm-badge farm-badge--loading">⏳ Klimazone wird ermittelt…</span>;
        case "error":
            return <span className="farm-badge farm-badge--error">⚠️ Klimazone nicht verfügbar</span>;
        case "done":
            return <span className="farm-badge farm-badge--done">🌿 Klimazone: <strong>{field.climateClass![0]} (KWB: {field.climateClass![1]})</strong></span>;
        default:
            return null;
    }
};

const NfkweBadge = ({field}: {field: Field;}) => {
    if (!field.nFkweClass) return null;
    return (
        <span className="farm-badge farm-badge--nfkwe">
            🪨 nFKWe-Klasse: <strong>{field.nFkweClass}</strong>
            {field.nFkweClassSource === 'manual' && (
                <span className="farm-badge__manual"> (manuell)</span>
            )}
        </span>
    );
};

export const FarmPage = () => {
    const {farm, updateFarmName, addField, editField, removeField} = useFarm();
    const {projects, removeFieldFromAllProjects} = useProjects();
    const addMessage = useAppStore((state) => state.addMessage);
    const [showAddField, setShowAddField] = useState(false);
    const [editingField, setEditingField] = useState<Field | null>(null);
    // editingName starts false: if the name is missing, the render gate
    // (editingName || !farm.name) still shows the input field. This way no
    // stale "editing" state lingers when the name is set from outside
    // (loading the demo, import).
    const [editingName, setEditingName] = useState(false);
    const [nameDraft, setNameDraft] = useState(farm.name);
    const [confirmImport, setConfirmImport] = useState<{farm: Farm; projects: Project[]} | null>(null);
    const [confirmReset, setConfirmReset] = useState(false);
    const [confirmLoadDemo, setConfirmLoadDemo] = useState(false);
    const [confirmDeleteFieldId, setConfirmDeleteFieldId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const importConfirmRef = useRef<HTMLDivElement>(null);
    const resetConfirmRef = useRef<HTMLDivElement>(null);
    const deleteConfirmRef = useRef<HTMLDivElement>(null);
    const demoConfirmRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!confirmImport) return;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                importConfirmRef.current?.scrollIntoView({behavior: "smooth", block: "center"});
            });
        });
    }, [confirmImport]);

    useEffect(() => {
        if (!confirmReset) return;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                resetConfirmRef.current?.scrollIntoView({behavior: "smooth", block: "center"});
            });
        });
    }, [confirmReset]);

    useEffect(() => {
        if (!confirmLoadDemo) return;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                demoConfirmRef.current?.scrollIntoView({behavior: "smooth", block: "center"});
            });
        });
    }, [confirmLoadDemo]);

    useEffect(() => {
        if (!confirmDeleteFieldId) return;
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                deleteConfirmRef.current?.scrollIntoView({behavior: "smooth", block: "center"});
            });
        });
    }, [confirmDeleteFieldId]);
    const [searchParams, setSearchParams] = useSearchParams();

    // Deep link from ProjectDetailPage: ?edit=<fieldId> opens the editor + scrolls.
    // URL-→-state synchronisation requires setState in the effect; this is not
    // a genuine anti-pattern (the source is external router state).
    useEffect(() => {
        const editId = searchParams.get("edit");
        if (!editId) return;
        const target = farm.fields.find((f) => f.id === editId);
        if (target) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setEditingField(target);
            setTimeout(() => {
                document.getElementById(`farm-field-${editId}`)?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
            }, 50);
        }
        // Remove the param so subsequent renders don't fire again
        searchParams.delete("edit");
        setSearchParams(searchParams, {replace: true});
    }, [searchParams, setSearchParams, farm.fields]);

    const handleReset = () => {
        localStorage.clear();
        window.location.reload();
    };

    const handleLoadDemo = () => {
        const {precipitationLookup, et0Lookup} = useAppStore.getState();
        const [, setFarm] = useLocalStore.getState().dwa_farm;
        const [, setProjects] = useLocalStore.getState().dwa_projects;
        const [, setTourCompleted] = useLocalStore.getState().dwa_tour_completed;
        seedDemoData(setFarm, setProjects, precipitationLookup, et0Lookup);
        // Loading the example = a deliberate "show me this" click → offer the Rundgang again
        // (the floating button is otherwise hidden once it was finished earlier).
        setTourCompleted(false);
        setConfirmLoadDemo(false);
        // Scroll to the top so the demo hint and the farm are visible.
        window.scrollTo({top: 0, behavior: "smooth"});
    };

    const handleExport = async () => {
        try {
            const result = await exportData(farm, projects);
            if (result === "downloaded") {
                addMessage({type: "info", message: ["Export wurde heruntergeladen."]});
            }
        } catch {
            // User cancelled share dialog — no action needed
        }
    };

    const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (!file) return;
        try {
            const text = await file.text();
            const parsed = parseImportFile(text);
            const importedFarm = sanitize("dwa_farm", parsed.farm) as Farm;
            // Reset climate statuses to "idle" only when the data is missing,
            // so refreshClimateData re-fetches it. When the exported data
            // already contains valid values, keep "done" to avoid losing them.
            importedFarm.fields = importedFarm.fields.map((f) => ({
                ...f,
                climateClassStatus: f.climateClass ? "done" as const : "idle" as const,
                climateDataStatus: f.climateData ? "done" as const : "idle" as const,
            }));
            const importedProjects = sanitize("dwa_projects", parsed.projects) as Project[];
            setConfirmImport({farm: importedFarm, projects: importedProjects});
        } catch (err) {
            addMessage({type: "error", message: [err instanceof Error ? err.message : "Import fehlgeschlagen."]});
        }
    };

    const handleConfirmImport = () => {
        if (!confirmImport) return;
        const state = useLocalStore.getState();
        state.dwa_farm[1](confirmImport.farm);
        state.dwa_projects[1](confirmImport.projects);
        const {precipitationLookup, et0Lookup} = useAppStore.getState();
        if (precipitationLookup && et0Lookup) {
            const [, setFarm] = useLocalStore.getState().dwa_farm;
            refreshClimateData(precipitationLookup, et0Lookup, setFarm, confirmImport.farm.fields);
        }
        addMessage({type: "info", message: ["Daten wurden erfolgreich importiert."]});
        setConfirmImport(null);
        setNameDraft(confirmImport.farm.name);
        setEditingName(!confirmImport.farm.name);
    };

    const demoProject = projects.find((p) => p.isDemo);

    return (
        <div className="page">
            <h1>Mein Betrieb</h1>

            <OnboardingBanner />
            {demoProject && <DemoHint variant="farm" />}

            <div className="farm-page__name-label" data-tour="farm-name">
                <strong>Name</strong>
                {editingName || !farm.name ? (
                    <>
                        <input
                            value={nameDraft}
                            onChange={(e) => setNameDraft(e.target.value)}
                            onBlur={() => {
                                // Apply the name when leaving the field, so the
                                // checkmark doesn't have to be clicked separately. Ignore
                                // empty input (the field stays in editing mode).
                                const trimmed = nameDraft.trim();
                                if (!trimmed) return;
                                updateFarmName(trimmed);
                                setEditingName(false);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    const trimmed = nameDraft.trim();
                                    if (!trimmed) return;
                                    updateFarmName(trimmed);
                                    setEditingName(false);
                                } else if (e.key === "Escape") {
                                    setNameDraft(farm.name);
                                    setEditingName(false);
                                }
                            }}
                            placeholder="Name des Betriebs"
                            className="farm-page__name-input"
                            autoFocus={!!farm.name}
                        />
                        <button
                            type="button"
                            className="farm-page__name-btn farm-page__name-btn--save"
                            onClick={() => {
                                const trimmed = nameDraft.trim();
                                if (!trimmed) return;
                                updateFarmName(trimmed);
                                setEditingName(false);
                            }}
                            disabled={!nameDraft.trim()}
                            title="Übernehmen"
                        >
                            ✓
                        </button>
                        <button
                            type="button"
                            className="farm-page__name-btn farm-page__name-btn--cancel"
                            // onMouseDown fires before the input onBlur, so "Verwerfen" (discard)
                            // is not overridden by the save-on-blur.
                            onMouseDown={(e) => {
                                e.preventDefault();
                                setNameDraft(farm.name);
                                setEditingName(false);
                            }}
                            disabled={!farm.name}
                            title="Verwerfen"
                        >
                            ✕
                        </button>
                    </>
                ) : (
                    <>
                        <span className="farm-page__name-display">{farm.name}</span>
                        <button
                            type="button"
                            className="farm-page__name-btn"
                            onClick={() => {
                                setNameDraft(farm.name);
                                setEditingName(true);
                            }}
                            title="Name bearbeiten"
                        >
                            ✏️
                        </button>
                    </>
                )}
            </div>

            <h2 className="farm-page__fields-heading" data-tour="farm-fields">Felder</h2>
            <InfoHint>
                Ein Feld (bzw. Schlag) ist eine zusammenhängende Fläche mit Standort und
                Bodenklasse. Legen Sie es einmal an – Klimadaten und Bodenzahl werden
                automatisch aus dem Standort ermittelt. In einem Szenario weisen Sie ihm
                dann eine Nutzung (z. B. Hauptkulturen oder Golf) zu und erhalten den Bedarf.
            </InfoHint>

            {farm.fields.length === 0 && (
                <p className="farm-page__empty-hint">
                    Noch keine Felder angelegt. Klicken Sie auf „+ Feld hinzufügen“, um Ihren ersten Schlag mit Standort und Bodenklasse zu erfassen.
                </p>
            )}

            {farm.fields.map((field) => (
                <div key={field.id} id={`farm-field-${field.id}`} className="farm-page__field-card">
                    {editingField?.id === field.id ? (
                        <FieldForm
                            initialValues={{...field}}
                            existingLocations={farm.fields.map((f) => ({...f.location, name: f.name}))}
                            onSave={(data) => {
                                editField(field.id, data);
                                setEditingField(null);
                            }}
                            onCancel={() => setEditingField(null)}
                        />
                    ) : (
                        <>
                            <strong>{field.name}</strong> — {formatNum(field.areaHa, 2)} ha
                            <br />
                            <small>
                                {formatNum(field.location.lat, 5)}° N, {formatNum(field.location.lon, 5)}° E
                            </small>
                            <br />
                            <ClimateClassBadge field={field} />
                            <br />
                            <NfkweBadge field={field} />
                            {field.climateDataStatus === "done" && field.climateData && (
                                <ClimateBarChart
                                    precipitation={field.climateData.precipitation}
                                    et0={field.climateData.et0}
                                />
                            )}
                            {field.climateDataStatus === "loading" && (
                                <small className="farm-badge farm-badge--loading">⏳ Klimadaten werden geladen…</small>
                            )}
                            {confirmDeleteFieldId === field.id ? (
                                <div ref={deleteConfirmRef} className="farm-page__delete-confirm">
                                    <strong>Schlag „{field.name}“ entfernen?</strong>
                                    <p>Der Schlag wird auch aus allen Szenarien entfernt.</p>
                                    <div className="farm-page__import-confirm-actions">
                                        <button
                                            className="farm-page__reset-confirm-btn"
                                            onClick={() => {
                                                removeFieldFromAllProjects(field.id);
                                                removeField(field.id);
                                                setConfirmDeleteFieldId(null);
                                            }}
                                        >
                                            Ja, entfernen
                                        </button>
                                        <button onClick={() => setConfirmDeleteFieldId(null)}>Abbrechen</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="farm-page__field-actions">
                                    <button onClick={() => setEditingField(field)}>✏️ Bearbeiten</button>
                                    <button onClick={() => setConfirmDeleteFieldId(field.id)}>
                                        🗑 <span className={clsx("red")}>Entfernen</span>
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            ))}

            {!editingField && (
                <div data-tour="add-field">
                    {showAddField ? (
                        <FieldForm
                            existingLocations={farm.fields.map((f) => ({...f.location, name: f.name}))}
                            onSave={(f) => {addField(f); setShowAddField(false);}}
                            onCancel={() => setShowAddField(false)}
                        />
                    ) : (
                        <button onClick={() => setShowAddField(true)} className="farm-page__add-btn">
                            + Feld hinzufügen
                        </button>
                    )}
                </div>
            )}

            <h2 className="farm-page__fields-heading">Daten exportieren / importieren</h2>
            <div className="farm-page__export-import">
                <button onClick={handleExport} disabled={!farm.name.trim() || farm.fields.length === 0}>📤 Daten exportieren</button>
                <button onClick={() => fileInputRef.current?.click()}>📥 Daten importieren</button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    hidden
                    onChange={handleFileSelect}
                />
            </div>

            <div className="farm-page__demo-load">
                {confirmLoadDemo ? (
                    <div ref={demoConfirmRef} className="farm-page__reset-confirm">
                        <strong>Beispieldaten laden?</strong>
                        <p>Der aktuelle Betrieb und alle Szenarien werden durch das Beispiel (Kartoffel-Acker + Golfplatz) ersetzt.</p>
                        <div className="farm-page__import-confirm-actions">
                            <button className="farm-page__demo-load-confirm-btn" onClick={handleLoadDemo}>Ja, Beispiel laden</button>
                            <button onClick={() => setConfirmLoadDemo(false)}>Abbrechen</button>
                        </div>
                    </div>
                ) : (
                    <button className="farm-page__demo-load-btn" onClick={() => setConfirmLoadDemo(true)}>
                        🎬 Beispiel laden
                    </button>
                )}
            </div>

            <div id="farm-reset" className="farm-page__reset">
                {confirmReset ? (
                    <div ref={resetConfirmRef} className="farm-page__reset-confirm">
                        <strong>Alle Daten unwiderruflich löschen?</strong>
                        <p>Betrieb, alle Felder und Szenarien werden gelöscht und können nicht wiederhergestellt werden.</p>
                        <div className="farm-page__import-confirm-actions">
                            <button className="farm-page__reset-confirm-btn" onClick={handleReset}>Ja, alles löschen</button>
                            <button onClick={() => setConfirmReset(false)}>Abbrechen</button>
                        </div>
                    </div>
                ) : (
                    <button className="farm-page__reset-btn" onClick={() => setConfirmReset(true)}>
                        🗑 Alle Daten löschen
                    </button>
                )}
            </div>

            {confirmImport && (
                <div ref={importConfirmRef} className="farm-page__import-confirm">
                    <strong>Achtung: Der Import ersetzt alle vorhandenen Daten.</strong>
                    <p>
                        Betrieb: {confirmImport.farm.name || "(kein Name)"},
                        {" "}{confirmImport.farm.fields.length} Feld(er),
                        {" "}{confirmImport.projects.length} {confirmImport.projects.length === 1 ? "Szenario" : "Szenarien"}
                    </p>
                    <div className="farm-page__import-confirm-actions">
                        <button onClick={handleConfirmImport}>Importieren</button>
                        <button onClick={() => setConfirmImport(null)}>Abbrechen</button>
                    </div>
                </div>
            )}
        </div>
    );
};