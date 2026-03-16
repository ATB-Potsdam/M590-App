// src/pages/AssignmentPage.tsx
import {useState} from 'react';
import {useNavigate, useParams} from 'react-router';
import {IrrigationPeriodPicker} from '../components/IrrigationPeriodPicker';
import {GemueseObstResultCard} from '../components/results/GemueseObstResult';
import {HauptkulturenResultCard} from '../components/results/HauptkulturenResult';
import {MODULES} from '../constants/modules';
import {PLANT_CATEGORIES} from '../constants/plantCategories';
import {rawVegetableDataAj} from '../constants/plantDataRaw';
import {cropNames} from '../constants/plantNames';
import {useFarm} from '../hooks/useFarm';
import {useProjects} from '../hooks/useProjects';
import {calculateGemueseObst, calculateGemueseObstBoth} from '../lib/calculations/gemueseObst';
import {calculateHauptkulturen, calculateHauptkulturenBoth} from '../lib/calculations/hauptkulturen';
import type {AnyPlantName, CropName, KwbZone, NFkweClassName} from '../types/dataTypes';
import type {IrrigationPeriod, ModuleType, PlantCategory} from '../types/project';
import {getLevel0Groups, getLevel1Options, hasVariants, parsePlantNames} from '../utils/plantNameParser';
import './AssignmentPage.scss';

const defaultPeriod: IrrigationPeriod = {
    from: {month: 4, position: 'early'},
    to: {month: 9, position: 'late'},
};

export const AssignmentPage = () => {
    const {id, assignmentId} = useParams<{id: string; assignmentId: string;}>();
    const navigate = useNavigate();
    const {projects, updateFieldAssignment} = useProjects();
    const {farm} = useFarm();

    const project = projects.find((p) => p.id === id);
    const assignment = project?.fieldAssignments.find((fa) => fa.id === assignmentId);
    const field = farm.fields.find((f) => f.id === assignment?.fieldId);

    const [module, setModule] = useState<ModuleType | undefined>(assignment?.module);
    const [plantCategory, setPlantCategory] = useState<PlantCategory | undefined>(assignment?.plantCategory);
    const [selectedLevel0, setSelectedLevel0] = useState<string | undefined>(assignment?.plantKey?.split('|')[0]);
    const [plantKey, setPlantKey] = useState<string | undefined>(assignment?.plantKey);
    const [irrigationPeriod, setIrrigationPeriod] = useState<IrrigationPeriod>(
        assignment?.irrigationPeriod ?? defaultPeriod
    );
    const [surchargeIntermediate, setSurchargeIntermediate] = useState(assignment?.surchargeIntermediate ?? false);
    const [surchargeEmergence, setSurchargeEmergence] = useState(assignment?.surchargeEmergence ?? 0);
    const [surchargeHeavySoil, setSurchargeHeavySoil] = useState(assignment?.surchargeHeavySoil ?? 0);

    if (!project || !assignment || !field) {
        return (
            <div className="page">
                <p>Zuweisung nicht gefunden.</p>
                <button onClick={() => navigate(`/projects/${id}`)}>← Zurück</button>
            </div>
        );
    }

    // Pflanzennamen für aktuell gewähltes Modul/Kategorie
    const currentNames =
        module === 'hauptkulturen'
            ? parsePlantNames(cropNames)
            : PLANT_CATEGORIES.find((c) => c.type === plantCategory)
                ? parsePlantNames(PLANT_CATEGORIES.find((c) => c.type === plantCategory)!.names)
                : [];

    const level0Groups = getLevel0Groups(currentNames);

    // Kein level1 nötig → fullKey = level0
    const resolveKey = (level0: string): string | undefined => {
        const opts = getLevel1Options(currentNames, level0);
        return opts.length === 1 && !opts[0].level1 ? level0 : undefined;
    };

    // A/J-Vorschlag für Gemüse/Obst
    const ajSuggested: number | null =
        module === 'gemuese_obst' && plantKey
            ? ((rawVegetableDataAj as Record<string, number | null>)[plantKey] ?? null)
            : null;

    const needsPlantSelection = module === 'hauptkulturen' || module === 'gemuese_obst';
    const showCategoryPicker = module === 'gemuese_obst' && !plantCategory;
    const showLevel0Picker = needsPlantSelection && (module === 'hauptkulturen' || plantCategory) && !selectedLevel0;
    const showLevel1Picker = selectedLevel0 && hasVariants(currentNames, selectedLevel0) && !plantKey;
    const showSurcharges = !!plantKey || (!!selectedLevel0 && !hasVariants(currentNames, selectedLevel0));
    const showSurchargesNonPlant = module && !needsPlantSelection;

    // Ergebnis live berechnen
    const result = (() => {
        if (module === 'hauptkulturen' && plantKey && field.climateClassStatus === 'done' && field.climateClass && field.nFkweClass) {
            const input = {
                crop: plantKey as CropName,
                nFkweClass: field.nFkweClass as NFkweClassName,
                kwbZone: field.climateClass[0] as KwbZone,
                areaHa: field.areaHa,
                surchargeIntermediate,
                surchargeEmergence,
                surchargeHeavySoil,
            };
            if (project.scenario === 'both') {
                const {normal, dry} = calculateHauptkulturenBoth(input);
                return {type: 'hauptkulturen' as const, normal, dry};
            }
            const res = calculateHauptkulturen({...input, scenario: project.scenario});
            return {
                type: 'hauptkulturen' as const,
                normal: project.scenario === 'normal' ? res : undefined,
                dry: project.scenario === 'dry' ? res : undefined,
            };
        }

        if (module === 'gemuese_obst' && plantKey && field.climateDataStatus === 'done' && field.climateData && field.nFkweClass) {
            const input = {
                plant: plantKey as AnyPlantName,
                nFkweClass: field.nFkweClass as NFkweClassName,
                areaHa: field.areaHa,
                irrigationPeriod,
                precipitation: field.climateData.precipitation,
                et0: field.climateData.et0,
                surchargeIntermediate,
                surchargeEmergence,
            };
            if (project.scenario === 'both') {
                const {normal, dry} = calculateGemueseObstBoth(input);
                return {type: 'gemuese_obst' as const, normal, dry};
            }
            const res = calculateGemueseObst({...input, scenario: project.scenario});
            return {
                type: 'gemuese_obst' as const,
                normal: project.scenario === 'normal' ? res : undefined,
                dry: project.scenario === 'dry' ? res : undefined,
            };
        }

        return null;
    })();

    const handleSave = () => {
        updateFieldAssignment(project.id, assignmentId!, {
            module,
            plantCategory,
            plantKey,
            irrigationPeriod,
            surchargeIntermediate,
            surchargeEmergence,
            surchargeHeavySoil,
        });
        navigate(`/projects/${id}`);
    };

    return (
        <div className="page">
            {/* Header */}
            <div className="assignment-page__header">
                <button className="assignment-page__back" onClick={() => navigate(`/projects/${id}`)}>
                    ← {project.name}
                </button>
                <h1>{field.name}</h1>
                <p className="assignment-page__meta">
                    {field.areaHa} ha
                    {field.climateClassStatus === 'done' && field.climateClass &&
                        ` · 🌿 Klimazone ${field.climateClass[0]}`}
                    {field.nFkweClass && ` · nFKWe ${field.nFkweClass}`}
                </p>
            </div>

            {/* Schritt 1: Modul */}
            <section className="assignment-section">
                <h2>1. Nutzungsmodul</h2>
                <div className="module-grid">
                    {MODULES.map((m) => (
                        <button
                            key={m.type}
                            className={`module-tile ${module === m.type ? 'module-tile--active' : ''}`}
                            onClick={() => {
                                setModule(m.type);
                                setPlantCategory(undefined);
                                setSelectedLevel0(undefined);
                                setPlantKey(undefined);
                            }}
                        >
                            <span className="module-tile__icon">{m.icon}</span>
                            <span className="module-tile__label">{m.label}</span>
                        </button>
                    ))}
                </div>
            </section>

            {/* Schritt 2a: Kategorie (nur Gemüse/Obst) */}
            {showCategoryPicker && (
                <section className="assignment-section">
                    <h2>2. Kategorie</h2>
                    <div className="option-list">
                        {PLANT_CATEGORIES.filter((c) => c.type !== 'hauptkulturen').map((cat) => (
                            <button key={cat.type} className="option-btn" onClick={() => setPlantCategory(cat.type)}>
                                {cat.icon} {cat.label}
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* Schritt 2b/3: Kultur wählen (level0) */}
            {showLevel0Picker && (
                <section className="assignment-section">
                    <h2>{module === 'hauptkulturen' ? '2.' : '3.'} Kultur wählen</h2>
                    <div className="option-list">
                        {level0Groups.map((name) => (
                            <button
                                key={name}
                                className="option-btn"
                                onClick={() => {
                                    setSelectedLevel0(name);
                                    const key = resolveKey(name);
                                    if (key) setPlantKey(key);
                                    // A/J-Vorschlag sofort in surchargeEmergence
                                    const suggested = (rawVegetableDataAj as Record<string, number | null>)[name];
                                    if (suggested != null) setSurchargeEmergence(suggested);
                                }}
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* Schritt 3/4: Variante wählen (level1/level2) */}
            {showLevel1Picker && selectedLevel0 && (
                <section className="assignment-section">
                    <h2>Variante wählen</h2>
                    <div className="option-list">
                        {getLevel1Options(currentNames, selectedLevel0).map((opt) => (
                            <button
                                key={opt.fullKey}
                                className="option-btn"
                                onClick={() => {
                                    setPlantKey(opt.fullKey);
                                    const suggested = (rawVegetableDataAj as Record<string, number | null>)[selectedLevel0];
                                    if (suggested != null) setSurchargeEmergence(suggested);
                                }}
                            >
                                {[opt.level1, opt.level2].filter(Boolean).join(' · ')}
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* Gewählte Pflanze */}
            {plantKey && (
                <div className="assignment-page__selection">
                    ✅ <strong>{plantKey.split('|').join(' · ')}</strong>
                    <button
                        className="link-btn"
                        onClick={() => {
                            setPlantKey(undefined);
                            setSelectedLevel0(undefined);
                            setSurchargeEmergence(0);
                        }}
                    >
                        ändern
                    </button>
                </div>
            )}

            {/* Bewässerungszeitraum + Zuschläge */}
            {(showSurcharges || showSurchargesNonPlant) && (
                <>
                    {needsPlantSelection && (
                        <section className="assignment-section">
                            <h2>Bewässerungszeitraum</h2>
                            <IrrigationPeriodPicker value={irrigationPeriod} onChange={setIrrigationPeriod} />
                        </section>
                    )}

                    <section className="assignment-section">
                        <h2>Zuschläge</h2>

                        {module === 'gemuese_obst' && ajSuggested !== null && (
                            <label className="surcharge-row">
                                <span>
                                    Auflaufbewässerung
                                    {ajSuggested !== surchargeEmergence && (
                                        <button
                                            type="button"
                                            className="link-btn"
                                            style={{marginLeft: 6, fontSize: 11}}
                                            onClick={() => setSurchargeEmergence(ajSuggested)}
                                        >
                                            Vorschlag: {ajSuggested} mm
                                        </button>
                                    )}
                                    {ajSuggested !== null && ajSuggested === surchargeEmergence && (
                                        <span style={{marginLeft: 6, fontSize: 11, color: '#2e7d32'}}>✓ Vorschlagswert</span>
                                    )}
                                </span>
                                <input
                                    type="range" min={0} max={40} step={5}
                                    value={surchargeEmergence}
                                    onChange={(e) => setSurchargeEmergence(Number(e.target.value))}
                                />
                                <span className="surcharge-value">{surchargeEmergence} mm</span>
                            </label>
                        )}

                        <label className="surcharge-row">
                            <input
                                type="checkbox"
                                checked={surchargeIntermediate}
                                onChange={(e) => setSurchargeIntermediate(e.target.checked)}
                            />
                            Zwischenfrucht <span className="surcharge-hint">+10 mm</span>
                        </label>

                        {/*
                        module === 'hauptkulturen' && (
                            <label className="surcharge-row">
                                Auflaufbewässerung
                                <span className="surcharge-hint">0–20 mm</span>
                                <input
                                    type="range" min={0} max={20} step={5}
                                    value={surchargeEmergence}
                                    onChange={(e) => setSurchargeEmergence(Number(e.target.value))}
                                />
                                <span className="surcharge-value">{surchargeEmergence} mm</span>
                            </label>
                        )
                        */}

                        {(plantKey?.startsWith('Kartoffel') || selectedLevel0?.startsWith('Kartoffel')) && (
                            <label className="surcharge-row">
                                Schwere Böden (Kartoffel)
                                <span className="surcharge-hint">0–20 mm</span>
                                <input
                                    type="range" min={0} max={20} step={5}
                                    value={surchargeHeavySoil}
                                    onChange={(e) => setSurchargeHeavySoil(Number(e.target.value))}
                                />
                                <span className="surcharge-value">{surchargeHeavySoil} mm</span>
                            </label>
                        )}
                    </section>
                </>
            )}

            {/* Ergebnis */}
            {result && (
                <section className="assignment-section">
                    <h2>Ergebnis</h2>
                    {result.type === 'hauptkulturen' ? (
                        <HauptkulturenResultCard
                            result={result.normal ?? result.dry!}
                            dryResult={result.normal && result.dry ? result.dry : undefined}
                            fieldName={field.name}
                            cropName={plantKey!}
                            areaHa={field.areaHa}
                        />
                    ) : (
                        <GemueseObstResultCard
                            result={result.normal ?? result.dry!}
                            dryResult={result.normal && result.dry ? result.dry : undefined}
                            fieldName={field.name}
                            plantName={plantKey!.split('|').join(' · ')}
                            areaHa={field.areaHa}
                        />
                    )}
                </section>
            )}

            {/* Speichern */}
            {module && (
                <button
                    className="assignment-page__save"
                    onClick={handleSave}
                    disabled={needsPlantSelection && !plantKey}
                >
                    Zuweisung speichern
                </button>
            )}
        </div>
    );
};
