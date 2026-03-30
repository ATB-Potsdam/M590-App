// src/pages/AssignmentPage.tsx
import {useState} from 'react';
import {useNavigate, useParams} from 'react-router';
import {GemueseObstResultCard} from '../components/results/GemueseObstResult';
import {HauptkulturenResultCard} from '../components/results/HauptkulturenResult';
import {WeinbauResultCard} from '../components/results/WeinbauResult';
import {GruenflaechenResultCard} from '../components/results/GruenflaechenResult';
import {NaturrasenResultCard} from '../components/results/NaturrasenResult';
import {GolfResultCard} from '../components/results/GolfResult';
import {KunstrasenResultCard} from '../components/results/KunstrasenResult';
import {TennenResultCard} from '../components/results/TennenResult';
import {MODULES} from '../constants/modules';
import {PLANT_CATEGORIES} from '../constants/plantCategories';
import {rawVegetableDataAj} from '../constants/plantDataRaw';
import {cropNames} from '../constants/plantNames';
import {allOtherPlants} from '../constants/soilConstants';
import {useFarm} from '../hooks/useFarm';
import {useProjects} from '../hooks/useProjects';
import {calculateGemueseObstBoth} from '../lib/calculations/gemueseObst';
import {calculateHauptkulturenBoth} from '../lib/calculations/hauptkulturen';
import {calculateGruenflaechen, VEGETATION_OPTIONS, MOISTURE_OPTIONS, SOIL_OPTIONS, SUN_OPTIONS} from '../lib/calculations/gruenflaechen';
import type {FllVegetation, FllMoisture, FllSoil, FllSun} from '../lib/calculations/gruenflaechen';
import {calculateWeinbauBoth} from '../lib/calculations/weinbau';
import {calculateNaturrasen} from '../lib/calculations/naturrasen';
import {calculateGolf, TABLE_35, type GolfAreaMode} from '../lib/calculations/golf';
import {calculateKunstrasen} from '../lib/calculations/kunstrasen';
import {calculateTennen} from '../lib/calculations/tennen';
import type {AnyPlantName, CropName, KwbZone, NFkweClassName, VegetableName} from '../types/dataTypes';
import type {IrrigationPeriod, ModuleType, PlantCategory} from '../types/project';
import {boundToLabel, periodToKey, timeRangeToPeriod} from '../utils/irrigationPeriod';
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
    const [isJunganlage, setIsJunganlage] = useState(assignment?.isJunganlage ?? false);
    // Grünflächen FLL factors
    const [fllVegetation, setFllVegetation] = useState<FllVegetation | undefined>(assignment?.fllVegetation);
    const [fllMoisture, setFllMoisture] = useState<FllMoisture | undefined>(assignment?.fllMoisture);
    const [fllSoil, setFllSoil] = useState<FllSoil | undefined>(assignment?.fllSoil);
    const [fllSun, setFllSun] = useState<FllSun | undefined>(assignment?.fllSun);
    const [fllPeriodStart, setFllPeriodStart] = useState(assignment?.fllPeriodStart ?? 4);
    const [fllPeriodEnd, setFllPeriodEnd] = useState(assignment?.fllPeriodEnd ?? 9);
    // Golf sub-areas
    const [golfAreaMode, setGolfAreaMode] = useState<GolfAreaMode | undefined>(assignment?.golfAreaMode);
    const [golfGreensM2, setGolfGreensM2] = useState<number | "">(assignment?.golfGreensM2 ?? "");
    const [golfTeeM2, setGolfTeeM2] = useState<number | "">(assignment?.golfTeeM2 ?? "");
    const [golfFairwayM2, setGolfFairwayM2] = useState<number | "">(assignment?.golfFairwayM2 ?? "");
    // Kunstrasen
    const [kunstrasenWeeks, setKunstrasenWeeks] = useState(assignment?.kunstrasenWeeks ?? 20);
    const [kunstrasenMmPerWeek, setKunstrasenMmPerWeek] = useState(assignment?.kunstrasenMmPerWeek ?? 30);
    // Alternative Wasserquellen
    const [altWasserM3, setAltWasserM3] = useState<number | "">(assignment?.altWasserM3 ?? "");

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

    const needsPlantSelection = module === 'gemuese_obst' || module === 'hauptkulturen';
    const needsIrrigationSelection = module === 'gemuese_obst';
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
            const {normal, dry} = calculateHauptkulturenBoth(input);
            return {type: 'hauptkulturen' as const, normal, dry};
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
            const {normal, dry} = calculateGemueseObstBoth(input);
            return {type: 'gemuese_obst' as const, normal, dry};
        }

        if (module === 'weinbau' && field.climateDataStatus === 'done' && field.climateData && field.nFkweClass) {
            const annualPrecipMm = field.climateData.precipitation
                .reduce((sum: number, v: number | null) => sum + (v ?? 0), 0);
            const input = {
                nFkweClass: field.nFkweClass as NFkweClassName,
                annualPrecipMm,
                areaHa: field.areaHa,
                isJunganlage,
            };
            const {normal, dry} = calculateWeinbauBoth(input);
            return {type: 'weinbau' as const, normal, dry};
        }

        if (module === 'gruenflaechen' && fllVegetation && fllMoisture && fllSoil && fllSun
            && field.climateDataStatus === 'done' && field.climateData) {
            const result = calculateGruenflaechen({
                vegetation: fllVegetation,
                moisture: fllMoisture,
                soil: fllSoil,
                sun: fllSun,
                areaHa: field.areaHa,
                et0: field.climateData.et0,
                periodStart: fllPeriodStart,
                periodEnd: fllPeriodEnd,
            });
            return {type: 'gruenflaechen' as const, normal: result, dry: undefined};
        }

        if (module === 'golf' && golfGreensM2 !== "" && golfTeeM2 !== "" && golfFairwayM2 !== ""
            && field.climateDataStatus === 'done' && field.climateData) {
            const annualPrecipMm = field.climateData.precipitation
                .reduce((sum: number, v: number | null) => sum + (v ?? 0), 0);
            const result = calculateGolf({annualPrecipMm, greensM2: golfGreensM2, teeM2: golfTeeM2, fairwayM2: golfFairwayM2});
            return {type: 'golf' as const, normal: result, dry: undefined};
        }

        if (module === 'kunstrasen') {
            const result = calculateKunstrasen({areaHa: field.areaHa, weeks: kunstrasenWeeks, mmPerWeek: kunstrasenMmPerWeek});
            return {type: 'kunstrasen' as const, normal: result, dry: undefined};
        }

        if (module === 'naturrasen' && field.climateDataStatus === 'done' && field.climateData) {
            const annualPrecipMm = field.climateData.precipitation
                .reduce((sum: number, v: number | null) => sum + (v ?? 0), 0);
            const result = calculateNaturrasen({annualPrecipMm, areaHa: field.areaHa});
            return {type: 'naturrasen' as const, normal: result, dry: undefined};
        }

        if (module === 'tennen' && field.climateDataStatus === 'done' && field.climateData) {
            const annualPrecipMm = field.climateData.precipitation
                .reduce((sum: number, v: number | null) => sum + (v ?? 0), 0);
            const result = calculateTennen({annualPrecipMm, areaHa: field.areaHa});
            return {type: 'tennen' as const, normal: result, dry: undefined};
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
            isJunganlage,
            fllVegetation,
            fllMoisture,
            fllSoil,
            fllSun,
            fllPeriodStart,
            fllPeriodEnd,
            golfAreaMode,
            golfGreensM2: golfGreensM2 !== "" ? golfGreensM2 : undefined,
            golfTeeM2: golfTeeM2 !== "" ? golfTeeM2 : undefined,
            golfFairwayM2: golfFairwayM2 !== "" ? golfFairwayM2 : undefined,
            kunstrasenWeeks,
            kunstrasenMmPerWeek,
            altWasserM3: altWasserM3 !== "" ? altWasserM3 : undefined,
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
                                setSurchargeHeavySoil(0);
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
                    <h2>3. Kultur wählen</h2>
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
                            setSurchargeHeavySoil(0);
                        }}
                    >
                        ändern
                    </button>
                </div>
            )}

            {/* Weinbau: Junganlage */}
            {module === 'weinbau' && (
                <section className="assignment-section">
                    <h2>Weinbau-Optionen</h2>
                    <label className="surcharge-row">
                        <input
                            type="checkbox"
                            checked={isJunganlage}
                            onChange={(e) => setIsJunganlage(e.target.checked)}
                        />
                        Junganlage / Neupflanzung
                    </label>
                    {isJunganlage && (
                        <p className="assignment-page__hint">
                            Für Jungfelder sind keine Untersuchungen bekannt.
                            Zur ersten Einschätzung werden die Werte für nFKWe 1–2 angesetzt.
                        </p>
                    )}
                </section>
            )}

            {/* Grünflächen: FLL-Faktoren */}
            {module === 'gruenflaechen' && (
                <>
                    <section className="assignment-section">
                        <h2>2. Vegetation (Faktor G)</h2>
                        <div className="option-list">
                            {VEGETATION_OPTIONS.map((o) => (
                                <button key={o.value}
                                    className={`option-btn ${fllVegetation === o.value ? 'option-btn--active' : ''}`}
                                    onClick={() => setFllVegetation(o.value)}
                                >{o.label}</button>
                            ))}
                        </div>
                    </section>

                    <section className="assignment-section">
                        <h2>3. Standortfeuchte (Faktor L)</h2>
                        <div className="option-list">
                            {MOISTURE_OPTIONS.map((o) => (
                                <button key={o.value}
                                    className={`option-btn ${fllMoisture === o.value ? 'option-btn--active' : ''}`}
                                    onClick={() => setFllMoisture(o.value)}
                                >{o.label}</button>
                            ))}
                        </div>
                    </section>

                    <section className="assignment-section">
                        <h2>4. Bodenart (Faktor B)</h2>
                        <div className="option-list">
                            {SOIL_OPTIONS.map((o) => (
                                <button key={o.value}
                                    className={`option-btn ${fllSoil === o.value ? 'option-btn--active' : ''}`}
                                    onClick={() => setFllSoil(o.value)}
                                >{o.label}</button>
                            ))}
                        </div>
                    </section>

                    <section className="assignment-section">
                        <h2>5. Sonnenexposition (Faktor S)</h2>
                        <div className="option-list">
                            {SUN_OPTIONS.map((o) => (
                                <button key={o.value}
                                    className={`option-btn ${fllSun === o.value ? 'option-btn--active' : ''}`}
                                    onClick={() => setFllSun(o.value)}
                                >{o.label}</button>
                            ))}
                        </div>
                    </section>

                    <section className="assignment-section">
                        <h2>6. Vegetationsperiode</h2>
                        <div className="assignment-page__period-row">
                            <label>
                                Von:
                                <select value={fllPeriodStart} onChange={(e) => {
                                    const v = Number(e.target.value);
                                    setFllPeriodStart(v);
                                    if (v > fllPeriodEnd) setFllPeriodEnd(v);
                                }} className="assignment-page__period-select">
                                    {[3,4,5,6,7,8,9,10].map((m) => (
                                        <option key={m} value={m}>{['','Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'][m]}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                Bis:
                                <select value={fllPeriodEnd} onChange={(e) => {
                                    const v = Number(e.target.value);
                                    setFllPeriodEnd(v);
                                    if (v < fllPeriodStart) setFllPeriodStart(v);
                                }} className="assignment-page__period-select">
                                    {[3,4,5,6,7,8,9,10].map((m) => (
                                        <option key={m} value={m}>{['','Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'][m]}</option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    </section>
                </>
            )}

            {/* Kunstrasen */}
            {module === 'kunstrasen' && (
                <>
                    <section className="assignment-section">
                        <h2>2. Wochen/Saison</h2>
                        <p className="assignment-page__hint">
                            Gemäß Merkblatt liegen in März–Oktober typischerweise 15–20 Wochen mit Befeuchtungsbedarf.
                        </p>
                        <div className="assignment-page__slider-row">
                            <input
                                type="range" min={1} max={30} step={1}
                                value={kunstrasenWeeks}
                                onChange={(e) => setKunstrasenWeeks(Number(e.target.value))}
                            />
                            <span className="surcharge-value">{kunstrasenWeeks} Wochen</span>
                        </div>
                    </section>

                    <section className="assignment-section">
                        <h2>3. Intensität (mm/Woche)</h2>
                        <div className="option-list option-list--spaced">
                            {([15, 30, 50] as const).map((val) => (
                                <button
                                    key={val}
                                    className={`option-btn ${kunstrasenMmPerWeek === val ? 'option-btn--active' : ''}`}
                                    onClick={() => setKunstrasenMmPerWeek(val)}
                                >
                                    {val === 15 ? 'Niedrig' : val === 30 ? 'Mittel' : 'Hoch'} ({val} mm)
                                </button>
                            ))}
                        </div>
                        <div className="assignment-page__slider-row">
                            <input
                                type="range" min={15} max={50} step={5}
                                value={kunstrasenMmPerWeek}
                                onChange={(e) => setKunstrasenMmPerWeek(Number(e.target.value))}
                            />
                            <span className="surcharge-value">{kunstrasenMmPerWeek} mm/Woche</span>
                        </div>
                    </section>
                </>
            )}

            {/* Golf: Teilflächen */}
            {module === 'golf' && (
                <>
                    <section className="assignment-section">
                        <h2>2. Flächeneingabe</h2>
                        <p className="assignment-page__hint">
                            Die Teilflächen sind nötig, weil je Bereich verschiedene Zusatzwasserbedarfe gelten.
                        </p>
                        <div className="option-list">
                            <button
                                className={`option-btn ${golfAreaMode === 'manual' ? 'option-btn--active' : ''}`}
                                onClick={() => setGolfAreaMode('manual')}
                            >Teilflächen sind bekannt</button>
                            <button
                                className={`option-btn ${golfAreaMode === '18hole' ? 'option-btn--active' : ''}`}
                                onClick={() => {
                                    setGolfAreaMode('18hole');
                                    setGolfGreensM2(TABLE_35['18hole'].greensM2);
                                    setGolfTeeM2(TABLE_35['18hole'].teeM2);
                                    setGolfFairwayM2(TABLE_35['18hole'].fairwayM2);
                                }}
                            >Standardflächen 18-Loch-Platz</button>
                            <button
                                className={`option-btn ${golfAreaMode === 'spielbahn' ? 'option-btn--active' : ''}`}
                                onClick={() => {
                                    setGolfAreaMode('spielbahn');
                                    setGolfGreensM2(TABLE_35['spielbahn'].greensM2);
                                    setGolfTeeM2(TABLE_35['spielbahn'].teeM2);
                                    setGolfFairwayM2(TABLE_35['spielbahn'].fairwayM2);
                                }}
                            >Standardflächen je Spielbahn</button>
                        </div>
                    </section>

                    {golfAreaMode && (
                        <section className="assignment-section">
                            <h2>3. Teilflächen</h2>
                            <div className="assignment-page__golf-inputs">
                                <label className="assignment-page__golf-label">
                                    <span>Grüns / Vorgrüns (m²)</span>
                                    <input
                                        type="number" min={0} step={1}
                                        value={golfGreensM2}
                                        onChange={(e) => setGolfGreensM2(e.target.value === "" ? "" : Number(e.target.value))}
                                        className="assignment-page__golf-input"
                                    />
                                </label>
                                <label className="assignment-page__golf-label">
                                    <span>Abschläge / Tees (m²)</span>
                                    <input
                                        type="number" min={0} step={1}
                                        value={golfTeeM2}
                                        onChange={(e) => setGolfTeeM2(e.target.value === "" ? "" : Number(e.target.value))}
                                        className="assignment-page__golf-input"
                                    />
                                </label>
                                <label className="assignment-page__golf-label">
                                    <span>Spielbahnen / Fairways (m²)</span>
                                    <input
                                        type="number" min={0} step={1}
                                        value={golfFairwayM2}
                                        onChange={(e) => setGolfFairwayM2(e.target.value === "" ? "" : Number(e.target.value))}
                                        className="assignment-page__golf-input"
                                    />
                                </label>
                            </div>
                        </section>
                    )}
                </>
            )}

            {/* Bewässerungszeitraum + Zuschläge */}
            {(showSurcharges || showSurchargesNonPlant) && module !== 'gruenflaechen' && module !== 'golf' && module !== 'kunstrasen' && module !== 'naturrasen' && module !== 'tennen' && (
                <>
                    {needsIrrigationSelection && plantKey && (
                        <section className="assignment-section">
                            <h2>Bewässerungszeitraum</h2>
                            {allOtherPlants[plantKey as VegetableName]?.[2]
                                .map(timeRangeToPeriod)
                                .map((timeRange) => {
                                    const key = periodToKey(timeRange);
                                    return <label key={key} className="assignment-page__radio-label">
                                        <input
                                            type="radio"
                                            name="irrigationPeriod"
                                            value={key}
                                            checked={periodToKey(irrigationPeriod) === key}
                                            onChange={() => setIrrigationPeriod(timeRange)}
                                        />
                                        {boundToLabel(timeRange.from)} bis {boundToLabel(timeRange.to)}
                                    </label>;
                                })}
                        </section>
                    )}
                    {/*
                    needsIrrigationSelection && (
                        <section className="assignment-section">
                            <h2>Bewässerungszeitraum</h2>
                            <IrrigationPeriodPicker value={irrigationPeriod} onChange={setIrrigationPeriod} />
                        </section>
                    )
                    */}

                    <section className="assignment-section">
                        <h2>Zuschläge</h2>

                        {module === 'gemuese_obst' && ajSuggested !== null && (
                            <label className="surcharge-row">
                                <span>
                                    Auflaufbewässerung
                                    {ajSuggested !== surchargeEmergence && (
                                        <button
                                            type="button"
                                            className="link-btn assignment-page__suggestion-btn"
                                            onClick={() => setSurchargeEmergence(ajSuggested)}
                                        >
                                            Vorschlag: {ajSuggested} mm
                                        </button>
                                    )}
                                    {ajSuggested !== null && ajSuggested === surchargeEmergence && (
                                        <span className="assignment-page__suggestion-ok">✓ Vorschlagswert</span>
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
                    {result.type === 'hauptkulturen' && (
                        <HauptkulturenResultCard
                            result={result.normal ?? result.dry!}
                            dryResult={result.normal && result.dry ? result.dry : undefined}
                            fieldName={field.name}
                            cropName={plantKey!}
                            areaHa={field.areaHa}
                        />
                    )}
                    {result.type === 'gemuese_obst' && (
                        <GemueseObstResultCard
                            result={result.normal ?? result.dry!}
                            dryResult={result.normal && result.dry ? result.dry : undefined}
                            fieldName={field.name}
                            plantName={plantKey!.split('|').join(' · ')}
                            areaHa={field.areaHa}
                        />
                    )}
                    {result.type === 'weinbau' && (
                        <WeinbauResultCard
                            result={result.normal ?? result.dry!}
                            dryResult={result.normal && result.dry ? result.dry : undefined}
                            fieldName={field.name}
                            areaHa={field.areaHa}
                        />
                    )}
                    {result.type === 'gruenflaechen' && result.normal && (
                        <GruenflaechenResultCard
                            result={result.normal}
                            fieldName={field.name}
                            areaHa={field.areaHa}
                        />
                    )}
                    {result.type === 'naturrasen' && result.normal && (
                        <NaturrasenResultCard
                            result={result.normal}
                            fieldName={field.name}
                            areaHa={field.areaHa}
                        />
                    )}
                    {result.type === 'golf' && result.normal && (
                        <GolfResultCard
                            result={result.normal}
                            fieldName={field.name}
                        />
                    )}
                    {result.type === 'kunstrasen' && result.normal && (
                        <KunstrasenResultCard
                            result={result.normal}
                            fieldName={field.name}
                        />
                    )}
                    {result.type === 'tennen' && result.normal && (
                        <TennenResultCard
                            result={result.normal}
                            fieldName={field.name}
                            areaHa={field.areaHa}
                        />
                    )}
                </section>
            )}

            {/* Alternative Wasserquellen */}
            {result && (module === 'gruenflaechen' || module === 'naturrasen' || module === 'golf' || module === 'kunstrasen' || module === 'tennen') && (
                <section className="assignment-section">
                    <h2>Alternative Wasserquellen</h2>
                    <p className="assignment-section__hint">
                        Gesammeltes Niederschlagswasser, Dränagewasser o. ä. kann vom Bruttobedarf abgezogen werden (Netto-Antragsmenge).
                    </p>
                    <label className="assignment-section__label">
                        Verfügbare alternative Wasserquellen (m³/a)
                        <input
                            type="number"
                            min={0}
                            step={1}
                            placeholder="0"
                            value={altWasserM3}
                            onChange={(e) => setAltWasserM3(e.target.value === "" ? "" : Number(e.target.value))}
                        />
                    </label>
                </section>
            )}

            {/* Speichern */}
            {module && (
                <button
                    className="assignment-page__save"
                    onClick={handleSave}
                    disabled={(needsPlantSelection && !plantKey) || (module === 'hauptkulturen' && !plantKey)}
                >
                    Zuweisung speichern
                </button>
            )}
        </div>
    );
};
