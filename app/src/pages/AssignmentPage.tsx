// src/pages/AssignmentPage.tsx
import {useEffect, useRef, useState} from 'react';
import {useNavigate, useParams} from 'react-router';
import {AssignmentSteps} from '../components/AssignmentSteps';
import {InfoHint} from '../components/InfoHint';
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
import {calculateHauptkulturenBoth, cropAllowsOptionalSurcharge} from '../lib/calculations/hauptkulturen';
import {calculateGruenflaechen, VEGETATION_OPTIONS, MOISTURE_OPTIONS, SOIL_OPTIONS, SUN_OPTIONS} from '../lib/calculations/gruenflaechen';
import type {FllVegetation, FllMoisture, FllSoil, FllSun} from '../lib/calculations/gruenflaechen';
import {calculateWeinbauBoth} from '../lib/calculations/weinbau';
import {calculateNaturrasen} from '../lib/calculations/naturrasen';
import {calculateGolf, TABLE_35, type GolfAreaMode} from '../lib/calculations/golf';
import {calculateKunstrasen} from '../lib/calculations/kunstrasen';
import {calculateTennen} from '../lib/calculations/tennen';
import type {AnyPlantName, CropName, KwbZone, NFkweClassName, VegetableName} from '../types/dataTypes';
import type {IrrigationPeriod, ModuleType, PlantCategory} from '../types/project';
import {formatPeriod, periodToKey, timeRangeToPeriod} from '../utils/irrigationPeriod';
import {getLevel0Groups, getLevel1Options, hasVariants, parsePlantNames} from '../utils/plantNameParser';
import {formatNum} from '../lib/formatNum';
import {BackButton} from '../components/BackButton';
import './AssignmentPage.scss';

export const AssignmentPage = () => {
    const {id, assignmentId} = useParams<{id: string; assignmentId: string;}>();
    const navigate = useNavigate();
    const {projects, updateFieldAssignment} = useProjects();
    const {farm} = useFarm();

    const project = projects.find((p) => p.id === id);
    const assignment = project?.fieldAssignments.find((fa) => fa.id === assignmentId);
    const field = farm.fields.find((f) => f.id === assignment?.fieldId);

    const nextStepRef = useRef<HTMLDivElement>(null);

    const [module, setModule] = useState<ModuleType | undefined>(assignment?.module);
    const [plantCategory, setPlantCategory] = useState<PlantCategory | undefined>(assignment?.plantCategory);
    const [selectedLevel0, setSelectedLevel0] = useState<string | undefined>(assignment?.plantKey?.split('|')[0]);
    const [plantKey, setPlantKey] = useState<string | undefined>(assignment?.plantKey);
    const [irrigationPeriod, setIrrigationPeriod] = useState<IrrigationPeriod | undefined>(
        assignment?.irrigationPeriod
    );
    const [surchargeIntermediate, setSurchargeIntermediate] = useState(assignment?.surchargeIntermediate ?? false);
    const [surchargeEmergence, setSurchargeEmergence] = useState(assignment?.surchargeEmergence ?? 0);
    const [surchargeHeavySoil, setSurchargeHeavySoil] = useState(assignment?.surchargeHeavySoil ?? 0);
    // Speisekartoffeln (table potatoes): undefined for old projects → true (keep previous behaviour)
    const [isTablePotato, setIsTablePotato] = useState(assignment?.isTablePotato ?? true);
    const [isSummerCereal, setIsSummerCereal] = useState(assignment?.isSummerCereal ?? false);
    const [userCustomMm, setUserCustomMm] = useState<number | "">(assignment?.userCustomMm ?? "");
    const [isJunganlage, setIsJunganlage] = useState(assignment?.isJunganlage ?? false);
    // Grünflächen (green spaces) FLL factors
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
    // Alternative Wasserquellen (alternative water sources) — explicit choice: none | available (m³/a)
    // Existing assignment with altWasserM3 === undefined → no mode → force a choice.
    // altWasserM3 === 0 is a valid answer "none available".
    type AltWasserMode = "none" | "available";
    const initialAltMode: AltWasserMode | undefined =
        assignment?.altWasserM3 === undefined
            ? undefined
            : assignment.altWasserM3 === 0
                ? "none"
                : "available";
    const [altWasserMode, setAltWasserMode] = useState<AltWasserMode | undefined>(initialAltMode);
    const [altWasserM3, setAltWasserM3] = useState<number | "">(
        assignment?.altWasserM3 !== undefined && assignment.altWasserM3 > 0 ? assignment.altWasserM3 : ""
    );

    const [showSaveHint, setShowSaveHint] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Auto-scroll to next step when key selections change
    useEffect(() => {
        if (module) {
            nextStepRef.current?.scrollIntoView({behavior: 'smooth', block: 'start'});
        }
    }, [module, plantCategory, selectedLevel0, plantKey]);

    if (!project || !assignment || !field) {
        return (
            <div className="page">
                <p>Zuweisung nicht gefunden.</p>
                <BackButton onClick={() => navigate(-1)}>Zurück</BackButton>
            </div>
        );
    }

    // Plant names for the currently selected module/category
    const currentNames =
        module === 'hauptkulturen'
            ? parsePlantNames(cropNames)
            : PLANT_CATEGORIES.find((c) => c.type === plantCategory)
                ? parsePlantNames(PLANT_CATEGORIES.find((c) => c.type === plantCategory)!.names)
                : [];

    const level0Groups = getLevel0Groups(currentNames);

    // Single-option group: fullKey directly (level0 or level0|level1)
    const resolveKey = (level0: string): string | undefined => {
        const opts = getLevel1Options(currentNames, level0);
        return opts.length === 1 ? opts[0].fullKey : undefined;
    };

    // Auto-select irrigation period: if only one period is available,
    // set it directly (avoids a redundant click and unrelated default values).
    const autoSetIrrigationPeriod = (fullKey: string) => {
        if (module !== 'gemuese_obst') return;
        const periods = (allOtherPlants[fullKey as VegetableName]?.[2] ?? []).map(timeRangeToPeriod);
        if (periods.length === 1) setIrrigationPeriod(periods[0]);
        else setIrrigationPeriod(undefined);
    };

    // A/J suggestion for Gemüse/Obst (vegetables/fruit)
    const ajSuggested: number | null =
        module === 'gemuese_obst' && plantKey
            ? ((rawVegetableDataAj as Record<string, number | null>)[plantKey] ?? null)
            : null;

    const needsPlantSelection = module === 'gemuese_obst' || module === 'hauptkulturen';
    const needsIrrigationSelection = module === 'gemuese_obst';
    const availablePeriods: IrrigationPeriod[] = needsIrrigationSelection && plantKey
        ? (allOtherPlants[plantKey as VegetableName]?.[2] ?? []).map(timeRangeToPeriod)
        : [];
    const irrigationPeriodMissing = needsIrrigationSelection && !!plantKey && (
        !irrigationPeriod ||
        !availablePeriods.some((tr) => periodToKey(tr) === periodToKey(irrigationPeriod))
    );
    const showCategoryPicker = module === 'gemuese_obst' && !plantCategory;
    const showLevel0Picker = needsPlantSelection && (module === 'hauptkulturen' || plantCategory) && !selectedLevel0;
    const showLevel1Picker = selectedLevel0 && hasVariants(currentNames, selectedLevel0) && !plantKey;
    const showSurcharges = !!plantKey || (!!selectedLevel0 && !hasVariants(currentNames, selectedLevel0));

    // Hauptkulturen-specific crop flags for the conditional surcharge UI
    const cropForRules = (plantKey ?? selectedLevel0) as CropName | undefined;
    const isPotato = plantKey?.startsWith('Kartoffel') || selectedLevel0?.startsWith('Kartoffel');
    const isOtherCereal = cropForRules === 'sonst. Getreide';
    // Zwischenfrucht (catch crop) / Auflaufbewässerung (emergence irrigation) only for
    // suitable crops (no winter crops; "sonst. Getreide" only if Sommergetreide is chosen).
    const optionalSurchargeAllowed = cropAllowsOptionalSurcharge(cropForRules, isSummerCereal);

    // Compute the result live
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
                isTablePotato,
                isSummerCereal,
                userCustomMm: userCustomMm === "" ? undefined : userCustomMm,
            };
            const {normal, dry} = calculateHauptkulturenBoth(input);
            return {type: 'hauptkulturen' as const, normal, dry};
        }

        if (module === 'gemuese_obst' && plantKey && irrigationPeriod && field.climateDataStatus === 'done' && field.climateData && field.nFkweClass) {
            const input = {
                plant: plantKey as AnyPlantName,
                nFkweClass: field.nFkweClass as NFkweClassName,
                areaHa: field.areaHa,
                irrigationPeriod,
                precipitation: field.climateData.precipitation,
                et0: field.climateData.et0,
                surchargeEmergence,
                userCustomMm: userCustomMm === "" ? undefined : userCustomMm,
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
            isTablePotato,
            isSummerCereal,
            userCustomMm: userCustomMm === "" ? undefined : userCustomMm,
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
            altWasserM3:
                altWasserMode === 'none'
                    ? 0
                    : altWasserMode === 'available' && altWasserM3 !== ""
                        ? altWasserM3
                        : undefined,
        });
        navigate(`/projects/${id}`, {replace: true});
    };

    return (
        <div className="page">
            {/* Header */}
            <div className="assignment-page__header">
                <BackButton onClick={() => navigate(-1)}>{project.name}</BackButton>
                <h1>{field.name}</h1>
                <p className="assignment-page__meta">
                    {formatNum(field.areaHa, 2)} ha
                    {field.climateClassStatus === 'done' && field.climateClass &&
                        ` · 🌿 Klimazone ${field.climateClass[0]}`}
                    {field.nFkweClass && ` · nFKWe ${field.nFkweClass}`}
                </p>
            </div>

            <AssignmentSteps current={!module ? 'module' : result ? 'result' : 'details'} />

            {/* Step 1: module */}
            <section className="assignment-section" data-tour="module-picker">
                <h2>1. Nutzungsmodul</h2>
                <InfoHint>
                    Das Nutzungsmodul bestimmt die Berechnungsmethode nach DWA-M 590.
                    Landwirtschaft (Hauptkulturen, Gemüse/Obst, Weinbau) nutzt Tabellenwerte
                    je Kultur; Sport- und Grünflächen (Golf, Rasen, Kunstrasen) rechnen nach
                    Fläche und Niederschlag. Wählen Sie die Nutzung, die zu dieser Fläche passt.
                </InfoHint>
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
                                setSurchargeEmergence(0);
                                setSurchargeHeavySoil(0);
                                setIsTablePotato(true);
                                setIsSummerCereal(false);
                                setUserCustomMm("");
                                setShowSaveHint(false);
                                setSearchTerm('');
                            }}
                        >
                            <span className="module-tile__icon">{m.icon}</span>
                            <span className="module-tile__label">{m.label}</span>
                        </button>
                    ))}
                </div>
            </section>

            <div ref={nextStepRef} />

            {/* Step 2a: category (only Gemüse/Obst) */}
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

            {/* Step 2b/3: choose crop (level0) */}
            {showLevel0Picker && (() => {
                const isSearchable = module === 'gemuese_obst' && level0Groups.length > 5;
                const filtered = isSearchable && searchTerm
                    ? level0Groups.filter((name) => name.toLowerCase().includes(searchTerm.toLowerCase()))
                    : level0Groups;
                return (
                    <section className="assignment-section">
                        <h2>3. Kultur wählen</h2>
                        {isSearchable && (
                            <input
                                type="text"
                                className="option-search"
                                placeholder="Suchen…"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        )}
                        <div className={`option-list${isSearchable ? ' option-list--scrollable' : ''}`}>
                            {filtered.map((name) => (
                                <button
                                    key={name}
                                    className="option-btn"
                                    onClick={() => {
                                        setSelectedLevel0(name);
                                        const key = resolveKey(name);
                                        if (key) {
                                            setPlantKey(key);
                                            autoSetIrrigationPeriod(key);
                                        }
                                        const suggested = (rawVegetableDataAj as Record<string, number | null>)[name];
                                        if (suggested != null) setSurchargeEmergence(suggested);
                                        setSearchTerm('');
                                    }}
                                >
                                    {name}
                                </button>
                            ))}
                        </div>
                    </section>
                );
            })()}

            {/* Step 3/4: choose variant (level1/level2) */}
            {showLevel1Picker && selectedLevel0 && (
                <section className="assignment-section">
                    <h2>{plantCategory === 'futter' ? 'Schnitte zur Samennutzung wählen' : 'Variante wählen'}</h2>
                    {selectedLevel0 === 'Silomais' && (
                        <p className="assignment-page__hint">
                            Körnermais benötigt im Vergleich zu Silomais generell einen Zuschlag von +20 mm/a (Merkblatt Kapitel 4.2.2).
                        </p>
                    )}
                    <div className="option-list">
                        {getLevel1Options(currentNames, selectedLevel0).map((opt) => (
                            <button
                                key={opt.fullKey}
                                className="option-btn"
                                onClick={() => {
                                    setPlantKey(opt.fullKey);
                                    autoSetIrrigationPeriod(opt.fullKey);
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

            {/* Selected plant */}
            {plantKey && (
                <div className="assignment-page__selection">
                    ✅ <strong>{plantKey.split('|').join(' · ')}</strong>
                    <button
                        className="link-btn"
                        onClick={() => {
                            setPlantKey(undefined);
                            setSelectedLevel0(undefined);
                            setIrrigationPeriod(undefined);
                            setSurchargeEmergence(0);
                            setSurchargeHeavySoil(0);
                            setIsTablePotato(true);
                            setIsSummerCereal(false);
                            setUserCustomMm("");
                        }}
                    >
                        ändern
                    </button>
                </div>
            )}

            {/* Weinbau: Junganlage (young vineyard) */}
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

            {/* Grünflächen: FLL factors */}
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

            {/* Golf: sub-areas */}
            {module === 'golf' && (
                <>
                    <section className="assignment-section">
                        <h2>2. Flächeneingabe</h2>
                        <p className="assignment-page__hint">
                            Jede Golfanlage unterscheidet zwischen Grüns, Abschlägen und Fairways –
                            für jeden dieser Bereiche gilt ein eigener Zusatzwasserbedarf. Geben Sie
                            daher gleich die jeweiligen Flächenanteile an (m² oder Standardwerte).
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

            {/* Irrigation period + surcharges — only for hauptkulturen / gemuese_obst (Spec Kapitel 4.2.2 / 4.3) */}
            {showSurcharges && (module === 'hauptkulturen' || module === 'gemuese_obst') && (
                <>
                    {needsIrrigationSelection && plantKey && availablePeriods.length > 0 && (
                        <section className="assignment-section">
                            <h2>Bewässerungszeitraum</h2>
                            {availablePeriods.map((timeRange) => {
                                const key = periodToKey(timeRange);
                                return <label key={key} className="assignment-page__radio-label">
                                    <input
                                        type="radio"
                                        name="irrigationPeriod"
                                        value={key}
                                        checked={!!irrigationPeriod && periodToKey(irrigationPeriod) === key}
                                        onChange={() => setIrrigationPeriod(timeRange)}
                                    />
                                    {formatPeriod(timeRange)}
                                </label>;
                            })}
                        </section>
                    )}

                    {((module === 'hauptkulturen' && (isPotato || isOtherCereal || optionalSurchargeAllowed))
                        || (module === 'gemuese_obst' && ajSuggested !== null)) && (
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

                        {module === 'hauptkulturen' && isPotato && (
                            <label className="surcharge-row">
                                <input
                                    type="checkbox"
                                    checked={isTablePotato}
                                    onChange={(e) => setIsTablePotato(e.target.checked)}
                                />
                                Speisekartoffeln <span className="surcharge-hint">+20 mm</span>
                            </label>
                        )}

                        {module === 'hauptkulturen' && isOtherCereal && (
                            <label className="surcharge-row">
                                <input
                                    type="checkbox"
                                    checked={isSummerCereal}
                                    onChange={(e) => setIsSummerCereal(e.target.checked)}
                                />
                                Sommergetreide <span className="surcharge-hint">z.B. Sommerhafer</span>
                            </label>
                        )}

                        {module === 'hauptkulturen' && optionalSurchargeAllowed && (
                            <label className="surcharge-row">
                                <input
                                    type="checkbox"
                                    checked={surchargeIntermediate}
                                    onChange={(e) => setSurchargeIntermediate(e.target.checked)}
                                />
                                Zwischenfrucht <span className="surcharge-hint">+10 mm</span>
                            </label>
                        )}

                        {module === 'hauptkulturen' && optionalSurchargeAllowed && (
                            <label className="surcharge-row">
                                <span>
                                    Auflaufbewässerung
                                    <span className="surcharge-hint"> · Frühjahrstrockenheit, 0–20 mm</span>
                                </span>
                                <input
                                    type="range" min={0} max={20} step={5}
                                    value={surchargeEmergence}
                                    onChange={(e) => setSurchargeEmergence(Number(e.target.value))}
                                />
                                <span className="surcharge-value">{surchargeEmergence} mm</span>
                            </label>
                        )}

                        {isPotato && (
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
                    )}
                </>
            )}

            {/* Result */}
            {result && (
                <section className="assignment-section" data-tour="assignment-result">
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

            {/* Custom additional irrigation — only when there is no literature value (or the user already set their own value) */}
            {result && (result.type === 'hauptkulturen' || result.type === 'gemuese_obst') && result.normal &&
                ('isUserCustom' in result.normal) &&
                (result.normal.isUserCustom || !result.normal.hasValue) && (
                <section className="assignment-section">
                    <h2>Benutzerdefinierte Zusatzbewässerung</h2>
                    <p className="assignment-section__hint">
                        Für diese Kultur liegt kein Literaturwert vor. Sie können hier optional einen eigenen
                        Schätzwert (mm/a) eingeben. Das Ergebnis wird klar als „benutzerdefiniert“ markiert.
                    </p>
                    <label className="assignment-section__label">
                        Benutzerdefinierter Bedarf (mm/a)
                        <input
                            type="number"
                            min={0}
                            step={1}
                            placeholder="z.B. 60"
                            value={userCustomMm}
                            onChange={(e) => setUserCustomMm(e.target.value === "" ? "" : Number(e.target.value))}
                        />
                    </label>
                </section>
            )}

            {/* Alternative Wasserquellen — mandatory field (Merkblatt: must be deducted) */}
            {result && (module === 'gruenflaechen' || module === 'naturrasen' || module === 'golf' || module === 'kunstrasen' || module === 'tennen') && (
                <section className="assignment-section">
                    <h2>Alternative Wasserquellen</h2>
                    <p className="assignment-section__hint">
                        Verfügbare alternative Wasserquellen (z.B. gesammeltes Niederschlagswasser, Dränagewasser) müssen vom Bruttobedarf abgezogen werden (Netto-Antragsmenge).
                    </p>
                    <label className="assignment-page__radio-label">
                        <input
                            type="radio"
                            name="altWasserMode"
                            checked={altWasserMode === 'none'}
                            onChange={() => {
                                setAltWasserMode('none');
                                setAltWasserM3("");
                            }}
                        />
                        Keine alternativen Wasserquellen vorhanden
                    </label>
                    <label className="assignment-page__radio-label">
                        <input
                            type="radio"
                            name="altWasserMode"
                            checked={altWasserMode === 'available'}
                            onChange={() => setAltWasserMode('available')}
                        />
                        <span className="assignment-page__radio-label-body">
                            Wasserquellen vorhanden
                            {altWasserMode === 'available' && (
                                <label className="assignment-section__label">
                                    Verfügbare Menge (m³/a)
                                    <input
                                        type="number"
                                        min={0}
                                        step={1}
                                        placeholder="0"
                                        value={altWasserM3}
                                        onChange={(e) => setAltWasserM3(e.target.value === "" ? "" : Number(e.target.value))}
                                    />
                                </label>
                            )}
                        </span>
                    </label>
                </section>
            )}

            {/* Save */}
            {module && (() => {
                const missingHints: string[] = [];
                if (needsPlantSelection && !plantKey) missingHints.push('Kultur auswählen');
                if (irrigationPeriodMissing) missingHints.push('Bewässerungszeitraum auswählen');
                if (module === 'gruenflaechen') {
                    if (!fllVegetation) missingHints.push('Vegetation auswählen');
                    if (!fllMoisture) missingHints.push('Standortfeuchte auswählen');
                    if (!fllSoil) missingHints.push('Bodenart auswählen');
                    if (!fllSun) missingHints.push('Sonnenexposition auswählen');
                }
                if (module === 'golf') {
                    if (!golfAreaMode) missingHints.push('Flächeneingabe-Modus wählen');
                    else if (!golfGreensM2 || !golfTeeM2 || !golfFairwayM2) missingHints.push('Teilflächen eingeben');
                }
                // Alt. Wasserquellen mandatory field for sport/green-space modules
                if (module === 'gruenflaechen' || module === 'naturrasen' || module === 'golf' || module === 'kunstrasen' || module === 'tennen') {
                    if (!altWasserMode) missingHints.push('Alternative Wasserquellen angeben');
                    else if (altWasserMode === 'available' && (altWasserM3 === "" || altWasserM3 < 0)) {
                        missingHints.push('Verfügbare Menge (m³/a) eingeben');
                    }
                }
                const isDisabled = missingHints.length > 0;
                return <>
                    {showSaveHint && isDisabled && (
                        <p className="assignment-page__save-hint">
                            {missingHints.join(', ')}
                        </p>
                    )}
                    <button
                        data-tour="assignment-save"
                        className={`assignment-page__save${isDisabled ? ' assignment-page__save--disabled' : ''}`}
                        onClick={() => {
                            if (isDisabled) {
                                setShowSaveHint(true);
                            } else {
                                handleSave();
                            }
                        }}
                    >
                        Zuweisung speichern
                    </button>
                    <button
                        className="assignment-page__cancel"
                        onClick={() => navigate(`/projects/${id}`, {replace: true})}
                    >
                        Abbrechen
                    </button>
                </>;
            })()}
        </div>
    );
};
