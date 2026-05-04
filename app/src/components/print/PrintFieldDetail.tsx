// src/components/print/PrintFieldDetail.tsx
import type {Field} from "../../types/farm";
import type {FieldAssignment, ModuleType} from "../../types/project";
import type {AssignmentResult} from "../../lib/calculations/getAssignmentResult";
import type {HauptkulturenResult} from "../../lib/calculations/hauptkulturen";
import type {GemueseObstResult} from "../../lib/calculations/gemueseObst";
import type {WeinbauResult} from "../../lib/calculations/weinbau";
import type {GruenflaechenResult} from "../../lib/calculations/gruenflaechen";
import type {NaturrasenResult} from "../../lib/calculations/naturrasen";
import type {GolfResult} from "../../lib/calculations/golf";
import type {KunstrasenResult} from "../../lib/calculations/kunstrasen";
import type {TennenResult} from "../../lib/calculations/tennen";
import {getModuleLabel} from "../../constants/modules";
import {MODULE_SOURCES, type SourceReference} from "../../constants/sources";
import {formatNum, formatRange} from "../../lib/formatNum";
import {boundToLabel} from "../../utils/irrigationPeriod";
import {
    VEGETATION_OPTIONS,
    MOISTURE_OPTIONS,
    SOIL_OPTIONS,
    SUN_OPTIONS,
} from "../../lib/calculations/gruenflaechen";
import "./PrintFieldDetail.scss";

const MONTH_NAMES = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

const precipClassLabel = (pc: string): string => {
    if (pc === "<500") return "< 500 mm/a";
    if (pc === "500-700") return "500–700 mm/a";
    if (pc === "700-900") return "700–900 mm/a";
    return "> 900 mm/a";
};

const formatOpenRange = (result: {isOpenRange: boolean; totalRangeMm: [number, number]}, unit: string): string => {
    if (result.isOpenRange) return `> ${formatNum(result.totalRangeMm[0], 0)} ${unit}`;
    return formatRange(result.totalRangeMm, unit);
};

interface Props {
    field: Field;
    assignment: FieldAssignment;
    result: AssignmentResult | null;
    index: number;
}

export const PrintFieldDetail = ({field, assignment: fa, result, index}: Props) => {
    if (!fa.module || !result) return null;

    const moduleLabel = getModuleLabel(fa.module);
    const source = MODULE_SOURCES[fa.module];
    const annualPrecip = field.climateData
        ? field.climateData.precipitation.reduce<number>((s, v) => s + (v ?? 0), 0)
        : 0;
    const annualEt0 = field.climateData
        ? field.climateData.et0.reduce<number>((s, v) => s + (v ?? 0), 0)
        : 0;

    return (
        <div className="print-detail">
            <h3 className="print-detail__title">
                {index}. {field.name} — {moduleLabel} — {formatNum(field.areaHa, 2)} ha
            </h3>

            {/* Standortdaten */}
            <table className="print-detail__table">
                <thead>
                    <tr><th colSpan={2}>Standortdaten</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Koordinaten</td>
                        <td>{formatNum(field.location.lat, 5)}° N, {formatNum(field.location.lon, 5)}° E</td>
                    </tr>
                    {field.climateClass && (
                        <>
                            <tr>
                                <td>KWBv-Zone</td>
                                <td>{field.climateClass[0]}</td>
                            </tr>
                            <tr>
                                <td>KWB (mm)</td>
                                <td>{formatNum(field.climateClass[1], 0)}</td>
                            </tr>
                        </>
                    )}
                    {field.nFkweClass && (
                        <tr>
                            <td>nFKWe-Klasse</td>
                            <td>{field.nFkweClass}</td>
                        </tr>
                    )}
                    {field.climateData && (
                        <>
                            <tr>
                                <td>Jahresniederschlag</td>
                                <td>{formatNum(annualPrecip, 0)} mm</td>
                            </tr>
                            <tr>
                                <td>Jahres-ET₀</td>
                                <td>{formatNum(annualEt0, 0)} mm</td>
                            </tr>
                        </>
                    )}
                </tbody>
            </table>

            {/* Nutzungsdaten */}
            <NutzungsdatenBlock fa={fa} />

            {/* Berechnungsgrundlagen */}
            <BerechnungsBlock module={fa.module} result={result} fa={fa} source={source} />

            {/* Zuschläge */}
            <ZuschlaegeBlock module={fa.module} result={result} />

            {/* Ergebnis */}
            <ErgebnisBlock result={result} />
        </div>
    );
};

// --- Nutzungsdaten ---
const NutzungsdatenBlock = ({fa}: {fa: FieldAssignment}) => {
    const rows: [string, string][] = [];

    if (fa.module === "hauptkulturen" || fa.module === "gemuese_obst") {
        if (fa.plantKey) {
            rows.push(["Kultur", fa.plantKey.split("|").slice(0, 2).join(" · ")]);
        }
    }

    if (fa.module === "gemuese_obst" && fa.irrigationPeriod) {
        rows.push(["Bewässerungszeitraum",
            `${boundToLabel(fa.irrigationPeriod.from)} – ${boundToLabel(fa.irrigationPeriod.to)}`]);
    }

    if (fa.module === "weinbau") {
        rows.push(["Junganlage", fa.isJunganlage ? "Ja" : "Nein"]);
    }

    if (fa.module === "gruenflaechen") {
        if (fa.fllVegetation) rows.push(["Vegetation", VEGETATION_OPTIONS.find(o => o.value === fa.fllVegetation)?.label ?? fa.fllVegetation]);
        if (fa.fllMoisture) rows.push(["Standortfeuchte", MOISTURE_OPTIONS.find(o => o.value === fa.fllMoisture)?.label ?? fa.fllMoisture]);
        if (fa.fllSoil) rows.push(["Bodenart", SOIL_OPTIONS.find(o => o.value === fa.fllSoil)?.label ?? fa.fllSoil]);
        if (fa.fllSun) rows.push(["Sonnenexposition", SUN_OPTIONS.find(o => o.value === fa.fllSun)?.label ?? fa.fllSun]);
        if (fa.fllPeriodStart && fa.fllPeriodEnd) {
            rows.push(["Zeitraum", `${MONTH_NAMES[fa.fllPeriodStart - 1]} – ${MONTH_NAMES[fa.fllPeriodEnd - 1]}`]);
        }
    }

    if (fa.module === "golf") {
        rows.push(["Flächenmodus", fa.golfAreaMode ?? "manual"]);
        if (fa.golfGreensM2 != null) rows.push(["Grüns/Vorgrüns", `${formatNum(fa.golfGreensM2, 0)} m²`]);
        if (fa.golfTeeM2 != null) rows.push(["Abschläge/Tees", `${formatNum(fa.golfTeeM2, 0)} m²`]);
        if (fa.golfFairwayM2 != null) rows.push(["Spielbahnen/Fairways", `${formatNum(fa.golfFairwayM2, 0)} m²`]);
    }

    if (fa.module === "kunstrasen") {
        if (fa.kunstrasenWeeks != null) rows.push(["Wochen/Saison", String(fa.kunstrasenWeeks)]);
        if (fa.kunstrasenMmPerWeek != null) rows.push(["Intensität", `${fa.kunstrasenMmPerWeek} mm/Woche`]);
    }

    if (rows.length === 0) return null;

    return (
        <table className="print-detail__table">
            <thead>
                <tr><th colSpan={2}>Nutzungsdaten</th></tr>
            </thead>
            <tbody>
                {rows.map(([label, value]) => (
                    <tr key={label}><td>{label}</td><td>{value}</td></tr>
                ))}
            </tbody>
        </table>
    );
};

// --- Berechnungsgrundlagen ---
const SourceLine = ({source}: {source: SourceReference}) => (
    <div className="print-detail__source">
        Quelle: {source.shortName} — {source.fullName}, {source.tables}
    </div>
);

const BerechnungsBlock = ({module, result, fa, source}: {module: ModuleType; result: AssignmentResult; fa: FieldAssignment; source: SourceReference}) => {
    const normal = result.normal;
    const dry = result.dry;

    if (module === "hauptkulturen" && normal) {
        const r = normal as HauptkulturenResult;
        const d = dry as HauptkulturenResult | undefined;
        return (
            <>
                <table className="print-detail__table">
                    <thead><tr><th colSpan={2}>Berechnungsgrundlagen</th></tr></thead>
                    <tbody>
                        <tr>
                            <td>Tabellenwert (Basis, Normaljahr)</td>
                            <td>{r.hasValue ? formatRange(r.baseRangeMm, "mm/a") : "kein Literaturwert"}</td>
                        </tr>
                        {d && (
                            <tr>
                                <td>Tabellenwert (Basis, Trockenjahr)</td>
                                <td>{d.hasValue ? formatRange(d.baseRangeMm, "mm/a") : "kein Literaturwert"}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <SourceLine source={source} />
            </>
        );
    }

    if (module === "gemuese_obst" && normal) {
        const r = normal as GemueseObstResult;
        const d = dry as GemueseObstResult | undefined;
        return (
            <>
                <table className="print-detail__table">
                    <thead><tr><th colSpan={2}>Berechnungsgrundlagen</th></tr></thead>
                    <tbody>
                        <tr>
                            <td>Basiswert Potsdam (Normaljahr)</td>
                            <td>{r.hasValue ? formatRange(r.baseRangeMm, "mm/a") : "kein Literaturwert"}</td>
                        </tr>
                        {d && (
                            <tr>
                                <td>Basiswert Potsdam (Trockenjahr)</td>
                                <td>{d.hasValue ? formatRange(d.baseRangeMm, "mm/a") : "kein Literaturwert"}</td>
                            </tr>
                        )}
                        <tr><td>ΔKWB Standort</td><td>{formatNum(r.deltaKwb, 1)} mm</td></tr>
                        <tr><td>Korrektur (×rFaktor)</td><td>{formatNum(r.correctionMm, 0)} mm</td></tr>
                        {fa.irrigationPeriod && r.monthlyRows.length > 0 && (
                            <tr>
                                <td colSpan={2}>
                                    <table className="print-detail__subtable">
                                        <thead>
                                            <tr>
                                                <th>Monat</th><th>N (mm)</th><th>ET₀</th>
                                                <th>KWB</th><th>KWB_Ref</th><th>ΔKWB</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {r.monthlyRows.map((row) => (
                                                <tr key={row.label}>
                                                    <td>{row.label}</td>
                                                    <td>{formatNum(row.precip, 0)}</td>
                                                    <td>{formatNum(row.et0, 0)}</td>
                                                    <td>{formatNum(row.localKwb, 0)}</td>
                                                    <td>{formatNum(row.refKwbVal, 0)}</td>
                                                    <td>{formatNum(row.weightedDelta, 1)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <SourceLine source={source} />
            </>
        );
    }

    if (module === "weinbau" && normal) {
        const r = normal as WeinbauResult;
        return (
            <>
                <table className="print-detail__table">
                    <thead><tr><th colSpan={2}>Berechnungsgrundlagen</th></tr></thead>
                    <tbody>
                        <tr>
                            <td>nFKWe-Gruppe</td>
                            <td>{r.weinbauNFkwe}{r.isJunganlage ? " (Junganlage)" : ""}</td>
                        </tr>
                        <tr><td>Jahresniederschlag</td><td>{formatNum(r.annualPrecipMm, 0)} mm</td></tr>
                        <tr><td>Niederschlagsklasse</td><td>{precipClassLabel(r.precipClass)}</td></tr>
                        <tr>
                            <td>Tabelle</td>
                            <td>{r.hasScenarioData ? "Tabelle 27 (Geisenheim)" : "Tabelle 26"}</td>
                        </tr>
                    </tbody>
                </table>
                <SourceLine source={source} />
            </>
        );
    }

    if (module === "gruenflaechen" && normal) {
        const r = normal as GruenflaechenResult;
        return (
            <>
                <table className="print-detail__table">
                    <thead><tr><th colSpan={2}>Berechnungsgrundlagen</th></tr></thead>
                    <tbody>
                        <tr>
                            <td>Ø ET₀ im Zeitraum ({MONTH_NAMES[r.periodStart - 1]}–{MONTH_NAMES[r.periodEnd - 1]})</td>
                            <td>{formatNum(r.avgDailyEt0, 2)} mm/d</td>
                        </tr>
                        <tr><td>Faktor L (Lebensbereich)</td><td>{r.factorL}</td></tr>
                        <tr><td>Faktor G (Vegetation)</td><td>{r.factorG}</td></tr>
                        <tr><td>Faktor B (Bodenart)</td><td>{r.factorB}</td></tr>
                        <tr><td>Faktor S (Sonne)</td><td>{r.factorS}</td></tr>
                        <tr><td>Faktorprodukt (L×G×B×S)</td><td><strong>{formatNum(r.factorProduct, 3)}</strong></td></tr>
                        <tr><td>ET_t = ET₀ × {formatNum(r.factorProduct, 3)}</td><td><strong>{formatNum(r.ettMmPerDay, 2)} mm/d</strong></td></tr>
                        <tr><td>Zeitraum</td><td>{r.periodDays} Tage</td></tr>
                    </tbody>
                </table>
                <SourceLine source={source} />
            </>
        );
    }

    if ((module === "naturrasen" || module === "tennen") && normal) {
        const r = normal as NaturrasenResult | TennenResult;
        return (
            <>
                <table className="print-detail__table">
                    <thead><tr><th colSpan={2}>Berechnungsgrundlagen</th></tr></thead>
                    <tbody>
                        <tr><td>Jahresniederschlag</td><td>{formatNum(r.annualPrecipMm, 0)} mm</td></tr>
                        <tr><td>Niederschlagsklasse</td><td>{precipClassLabel(r.precipClass)}</td></tr>
                    </tbody>
                </table>
                <SourceLine source={source} />
            </>
        );
    }

    if (module === "golf" && normal) {
        const r = normal as GolfResult;
        return (
            <>
                <table className="print-detail__table">
                    <thead><tr><th colSpan={2}>Berechnungsgrundlagen</th></tr></thead>
                    <tbody>
                        <tr><td>Jahresniederschlag</td><td>{formatNum(r.annualPrecipMm, 0)} mm</td></tr>
                        <tr><td>Niederschlagsklasse</td><td>{precipClassLabel(r.precipClass)}</td></tr>
                        <tr>
                            <td colSpan={2}>
                                <table className="print-detail__subtable">
                                    <thead>
                                        <tr><th>Bereich</th><th>Fläche (m²)</th><th>ZWB (mm/a)</th><th>ZWB (m³/a)</th></tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>Grüns/Vorgrüns</td>
                                            <td>{formatNum(r.greens.areaM2, 0)}</td>
                                            <td>{formatRange(r.greens.rangeMmPerA, "mm/a")}</td>
                                            <td>{formatRange(r.greens.rangeM3, "m³/a")}</td>
                                        </tr>
                                        <tr>
                                            <td>Abschläge/Tees</td>
                                            <td>{formatNum(r.tees.areaM2, 0)}</td>
                                            <td>{formatRange(r.tees.rangeMmPerA, "mm/a")}</td>
                                            <td>{formatRange(r.tees.rangeM3, "m³/a")}</td>
                                        </tr>
                                        <tr>
                                            <td>Spielbahnen/Fairways</td>
                                            <td>{formatNum(r.fairways.areaM2, 0)}</td>
                                            <td>{formatRange(r.fairways.rangeMmPerA, "mm/a")}</td>
                                            <td>{formatRange(r.fairways.rangeM3, "m³/a")}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <SourceLine source={source} />
            </>
        );
    }

    if (module === "kunstrasen" && normal) {
        const r = normal as KunstrasenResult;
        return (
            <>
                <table className="print-detail__table">
                    <thead><tr><th colSpan={2}>Berechnungsgrundlagen</th></tr></thead>
                    <tbody>
                        <tr><td>Fläche</td><td>{formatNum(r.areaHa, 2)} ha</td></tr>
                        <tr><td>Wochen/Saison</td><td>{r.weeks}</td></tr>
                        <tr><td>Intensität</td><td>{r.mmPerWeek} mm/Woche</td></tr>
                        <tr>
                            <td>Formel</td>
                            <td>{r.weeks} × {r.mmPerWeek} mm/Woche = {r.annualMm} mm/a</td>
                        </tr>
                    </tbody>
                </table>
                <SourceLine source={source} />
            </>
        );
    }

    return null;
};

// --- Zuschläge ---
const ZuschlaegeBlock = ({module, result}: {module: ModuleType; result: AssignmentResult}) => {
    if (module !== "hauptkulturen" && module !== "gemuese_obst") return null;

    const r = result.normal as HauptkulturenResult | GemueseObstResult | undefined;
    if (!r) return null;

    const rows: [string, string][] = [];

    if (module === "hauptkulturen") {
        const hk = r as HauptkulturenResult;
        if (hk.autoSurchargeMm > 0) {
            rows.push(["Automatisch (Kultur)", `+${formatNum(hk.autoSurchargeMm, 0)} mm`]);
        }
        if (hk.optionalSurchargeMm > 0) {
            rows.push(["Optionale Zuschläge", `+${formatNum(hk.optionalSurchargeMm, 0)} mm`]);
        }
    }

    if (module === "gemuese_obst") {
        const go = r as GemueseObstResult;
        if (go.optionalSurchargeMm > 0) {
            rows.push(["Weitere Zuschläge", `+${formatNum(go.optionalSurchargeMm, 0)} mm`]);
        }
    }

    if (rows.length === 0) return null;

    return (
        <table className="print-detail__table">
            <thead><tr><th colSpan={2}>Zuschläge</th></tr></thead>
            <tbody>
                {rows.map(([label, value]) => (
                    <tr key={label}><td>{label}</td><td>{value}</td></tr>
                ))}
            </tbody>
        </table>
    );
};

// --- Ergebnis ---
const ErgebnisBlock = ({result}: {result: AssignmentResult}) => {
    const normal = result.normal;
    const dry = result.dry;
    const normalHasValue = normal && (!('hasValue' in normal) || normal.hasValue);
    const dryHasValue = dry && (!('hasValue' in dry) || dry.hasValue);

    const isOpenRange = normal && 'isOpenRange' in normal && (normal as NaturrasenResult).isOpenRange;

    return (
        <table className="print-detail__table print-detail__table--result">
            <thead><tr><th colSpan={2}>Ergebnis</th></tr></thead>
            <tbody>
                {normalHasValue && normal ? (
                    <tr>
                        <td>🌤 Normaljahr</td>
                        <td>
                            {isOpenRange
                                ? formatOpenRange(normal as NaturrasenResult, "mm/a")
                                : formatRange(normal.totalRangeMm, "mm/a")
                            }
                            {" · "}
                            {formatRange(normal.totalRangeM3, "m³/a")}
                        </td>
                    </tr>
                ) : normal ? (
                    <tr>
                        <td>🌤 Normaljahr</td>
                        <td>Kein Literaturwert vorhanden</td>
                    </tr>
                ) : null}
                {dryHasValue && dry ? (
                    <tr>
                        <td>☀️ Trockenjahr</td>
                        <td>
                            {formatRange(dry.totalRangeMm, "mm/a")}
                            {" · "}
                            {formatRange(dry.totalRangeM3, "m³/a")}
                        </td>
                    </tr>
                ) : dry ? (
                    <tr>
                        <td>☀️ Trockenjahr</td>
                        <td>Kein Literaturwert vorhanden</td>
                    </tr>
                ) : null}
                {result.altWasserM3 != null && result.altWasserM3 > 0 && (
                    <tr>
                        <td>Alt. Wasserquellen</td>
                        <td>−{formatNum(result.altWasserM3, 0)} m³/a</td>
                    </tr>
                )}
            </tbody>
        </table>
    );
};
