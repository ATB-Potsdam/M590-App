// src/pages/AssignmentPage.tsx
import {useState} from "react";
import {useNavigate, useParams} from "react-router";
import {IrrigationPeriodPicker} from "../components/IrrigationPeriodPicker";
import {
    agriculturalPlantNames,
    cropNames,
    fodderPlantNames,
    fruitNames,
    medicalPlantNames,
    vegetableNames,
} from "../constants/plantNames";
import {useFarm} from "../hooks/useFarm";
import {useProjects} from "../hooks/useProjects";
import type {IrrigationPeriod, ModuleType, PlantCategory} from "../types/project";
import {
    getLevel0Groups, getLevel1Options, hasVariants,
    parsePlantNames,
} from "../utils/plantNameParser";
import "./AssignmentPage.scss";

// ── Modul-Definitionen ────────────────────────────────────────────────────────

const MODULES: {type: ModuleType; icon: string; label: string;}[] = [
    {type: "hauptkulturen", icon: "🌾", label: "Hauptkulturen"},
    {type: "gemuese_obst", icon: "🥦", label: "Gemüse / Obst"},
    {type: "weinbau", icon: "🍷", label: "Weinbau"},
    {type: "gruenflaechen", icon: "🌿", label: "Grünflächen"},
    {type: "naturrasen", icon: "⚽", label: "Naturrasensportplatz"},
    {type: "golf", icon: "⛳", label: "Golfplatz"},
    {type: "kunstrasen", icon: "🏟", label: "Kunstrasen"},
    {type: "tennen", icon: "🎾", label: "Tennenfläche"},
];

// ── Pflanzenkategorien für Gemüse/Obst ────────────────────────────────────────

const PLANT_CATEGORIES: {type: PlantCategory; label: string; names: readonly string[];}[] = [
    {type: "gemuese", label: "🥦 Gemüse", names: vegetableNames},
    {type: "obst", label: "🍎 Obst", names: fruitNames},
    {type: "medizinal", label: "🌿 Medizinalpflanzen", names: medicalPlantNames},
    {type: "agrar", label: "🌱 Agrarpflanzen", names: agriculturalPlantNames},
    {type: "futter", label: "🌾 Futterpflanzen", names: fodderPlantNames},
];

// ── Komponente ────────────────────────────────────────────────────────────────

export const AssignmentPage = () => {
    const {id, assignmentId} = useParams<{id: string; assignmentId: string;}>();
    const navigate = useNavigate();
    const {projects, updateFieldAssignment} = useProjects();
    const {farm} = useFarm();
    const project = projects.find((p) => p.id === id);
    const assignment = project?.fieldAssignments.find((fa) => fa.id === assignmentId);
    const field = farm.fields.find((f) => f.id === assignment?.fieldId);

    // Lokaler State für Wizard-Schritte
    const [module, setModule] = useState<ModuleType | undefined>(assignment?.module);
    const [plantCategory, setPlantCategory] = useState<PlantCategory | undefined>(assignment?.plantCategory);
    const [selectedLevel0, setSelectedLevel0] = useState<string | undefined>(
        assignment?.plantKey?.split("|")[0]
    );
    const [plantKey, setPlantKey] = useState<string | undefined>(assignment?.plantKey);
    const [surchargeIntermediate, setSurchargeIntermediate] = useState(
        assignment?.surchargeIntermediate ?? false
    );
    const [surchargeEmergence, setSurchargeEmergence] = useState(
        assignment?.surchargeEmergence ?? 0
    );
    const [surchargeHeavySoil, setSurchargeHeavySoil] = useState(
        assignment?.surchargeHeavySoil ?? 0
    );

    const [irrigationPeriod, setIrrigationPeriod] = useState<IrrigationPeriod | undefined>(
        assignment?.irrigationPeriod
    );

    if (!project || !assignment || !field) {
        return (
            <div className="page">
                <p>Zuweisung nicht gefunden.</p>
                <button onClick={() => navigate(`/projects/${id}`)}>← Zurück</button>
            </div>
        );
    }

    // Pflanzennamen für aktuell gewählte Kategorie
    const currentNames =
        module === "hauptkulturen"
            ? parsePlantNames(cropNames)
            : PLANT_CATEGORIES.find((c) => c.type === plantCategory)
                ? parsePlantNames(PLANT_CATEGORIES.find((c) => c.type === plantCategory)!.names)
                : [];

    const level0Groups = getLevel0Groups(currentNames);

    const handleSave = () => {
        if (!project || !assignmentId) return;
        updateFieldAssignment(project.id, assignmentId, {
            module,
            plantCategory,
            plantKey,
            irrigationPeriod,       // ← neu
            surchargeIntermediate,
            surchargeEmergence,
            surchargeHeavySoil,
        });
        navigate(`/projects/${id}`);
    };

    const needsPlantSelection = module === "hauptkulturen" || module === "gemuese_obst";
    const showCategoryPicker = module === "gemuese_obst" && !plantCategory;
    const showLevel0Picker = needsPlantSelection &&
        (module === "hauptkulturen" || plantCategory) && !selectedLevel0;
    const showLevel1Picker = selectedLevel0 &&
        hasVariants(currentNames, selectedLevel0) && !plantKey;
    const showSurcharges = plantKey !== undefined ||
        (selectedLevel0 && !hasVariants(currentNames, selectedLevel0));

    // Wenn level0 keine Varianten hat, ist der fullKey = level0
    const resolveKey = (level0: string) => {
        const opts = getLevel1Options(currentNames, level0);
        return opts.length === 1 && !opts[0].level1 ? level0 : undefined;
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
                    {field.climateClassStatus === "done" && field.climateClass &&
                        ` · 🌿 Klimazone ${field.climateClass[0]}`}
                </p>
            </div>

            {/* Schritt 1: Modul wählen */}
            <section className="assignment-section">
                <h2>1. Nutzungsmodul</h2>
                <div className="module-grid">
                    {MODULES.map((m) => (
                        <button
                            key={m.type}
                            className={`module-tile ${module === m.type ? "module-tile--active" : ""}`}
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

            {/* Schritt 2a: Pflanzenkategorie (nur Gemüse/Obst) */}
            {showCategoryPicker && (
                <section className="assignment-section">
                    <h2>2. Kategorie</h2>
                    <div className="option-list">
                        {PLANT_CATEGORIES.map((cat) => (
                            <button
                                key={cat.type}
                                className="option-btn"
                                onClick={() => setPlantCategory(cat.type)}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* Schritt 2b / 3: Pflanze (level0) wählen */}
            {showLevel0Picker && (
                <section className="assignment-section">
                    <h2>{module === "hauptkulturen" ? "2." : "3."} Kultur wählen</h2>
                    <div className="option-list">
                        {level0Groups.map((name) => (
                            <button
                                key={name}
                                className="option-btn"
                                onClick={() => {
                                    setSelectedLevel0(name);
                                    const key = resolveKey(name);
                                    if (key) setPlantKey(key); // kein level1 nötig
                                }}
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {/* Schritt 3 / 4: Variante (level1 / level2) wählen */}
            {showLevel1Picker && selectedLevel0 && (
                <section className="assignment-section">
                    <h2>Variante wählen</h2>
                    <div className="option-list">
                        {getLevel1Options(currentNames, selectedLevel0).map((opt) => {
                            const variantLabel = [opt.level1, opt.level2].filter(Boolean).join(" · ");
                            return (
                                <button
                                    key={opt.fullKey}
                                    className="option-btn"
                                    onClick={() => setPlantKey(opt.fullKey)}
                                >
                                    {variantLabel}
                                </button>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Gewählte Pflanze anzeigen + Reset */}
            {plantKey && (
                <div className="assignment-page__selection">
                    ✅ <strong>{plantKey.split("|").join(" · ")}</strong>
                    <button
                        className="link-btn"
                        onClick={() => {setPlantKey(undefined); setSelectedLevel0(undefined);}}
                    >
                        ändern
                    </button>
                </div>
            )}

            {/* Bewässerungszeitraum/Zuschläge */}
            {showSurcharges && (
                <>
                    <section className="assignment-section">
                        <h2>Bewässerungszeitraum</h2>
                        <IrrigationPeriodPicker
                            value={irrigationPeriod}
                            onChange={setIrrigationPeriod}
                        />
                    </section>
                    <section className="assignment-section">
                        <h2>Zuschläge</h2>

                        <label className="surcharge-row">
                            <input
                                type="checkbox"
                                checked={surchargeIntermediate}
                                onChange={(e) => setSurchargeIntermediate(e.target.checked)}
                            />
                            Zwischenfrucht <span className="surcharge-hint">+10 mm</span>
                        </label>

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

                        {(plantKey?.startsWith("Kartoffel") || selectedLevel0?.startsWith("Kartoffel")) && (
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

            {/* Speichern */}
            {module && (
                <button
                    className="assignment-page__save"
                    onClick={handleSave}
                    disabled={needsPlantSelection && !plantKey && !showSurcharges}
                >
                    Zuweisung speichern
                </button>
            )}
        </div>
    );
};
