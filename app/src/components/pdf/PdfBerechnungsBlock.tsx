// src/components/pdf/PdfBerechnungsBlock.tsx
import {Text, View} from "@react-pdf/renderer";
import {styles} from "./PdfStyles";
import {formatNumDe, formatRangeDe} from "./pdfFormatNum";
import type {AssignmentResult} from "../../lib/calculations/getAssignmentResult";
import type {HauptkulturenResult} from "../../lib/calculations/hauptkulturen";
import type {GemueseObstResult} from "../../lib/calculations/gemueseObst";
import type {WeinbauResult} from "../../lib/calculations/weinbau";
import type {GruenflaechenResult} from "../../lib/calculations/gruenflaechen";
import type {NaturrasenResult} from "../../lib/calculations/naturrasen";
import type {GolfResult} from "../../lib/calculations/golf";
import type {KunstrasenResult} from "../../lib/calculations/kunstrasen";
import type {TennenResult} from "../../lib/calculations/tennen";
import type {FieldAssignment, ModuleType} from "../../types/project";
import type {SourceReference} from "../../constants/sources";
import {
    VEGETATION_OPTIONS,
    MOISTURE_OPTIONS,
    SOIL_OPTIONS,
    SUN_OPTIONS,
} from "../../lib/calculations/gruenflaechen";

const MONTH_NAMES = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

const precipClassLabel = (pc: string): string => {
    if (pc === "<500") return "< 500 mm/a";
    if (pc === "500-700") return "500–700 mm/a";
    if (pc === "700-900") return "700–900 mm/a";
    return "> 900 mm/a";
};

interface Props {
    module: ModuleType;
    result: AssignmentResult;
    fa: FieldAssignment;
    source: SourceReference;
}

const SourceLine = ({source}: {source: SourceReference}) => (
    <Text style={styles.sourceLine}>
        Quelle: {source.shortName} — {source.fullName}, {source.tables}
    </Text>
);

const DetailRow = ({label, value}: {label: string; value: string}) => (
    <View style={styles.detailTableRow}>
        <Text style={styles.detailTableLabel}>{label}</Text>
        <Text style={styles.detailTableValue}>{value}</Text>
    </View>
);

const DetailRowBold = ({label, value}: {label: string; value: string}) => (
    <View style={styles.detailTableRow}>
        <Text style={styles.detailTableLabel}>{label}</Text>
        <Text style={styles.detailTableValueBold}>{value}</Text>
    </View>
);

export const PdfBerechnungsBlock = ({module, result, fa, source}: Props) => {
    const normal = result.normal;
    const dry = result.dry;

    if (module === "hauptkulturen" && normal) {
        const r = normal as HauptkulturenResult;
        const d = dry as HauptkulturenResult | undefined;
        return (
            <>
                <View style={styles.detailTable}>
                    <View style={styles.detailTableHeader}>
                        <Text style={styles.detailTableHeaderCell}>Berechnungsgrundlagen</Text>
                    </View>
                    <DetailRow
                        label="Tabellenwert (Basis, Normaljahr)"
                        value={r.hasValue ? formatRangeDe(r.baseRangeMm, "mm/a") : "kein Literaturwert"}
                    />
                    {d && (
                        <DetailRow
                            label="Tabellenwert (Basis, Trockenjahr)"
                            value={d.hasValue ? formatRangeDe(d.baseRangeMm, "mm/a") : "kein Literaturwert"}
                        />
                    )}
                </View>
                <SourceLine source={source} />
            </>
        );
    }

    if (module === "gemuese_obst" && normal) {
        const r = normal as GemueseObstResult;
        const d = dry as GemueseObstResult | undefined;
        return (
            <>
                <View style={styles.detailTable}>
                    <View style={styles.detailTableHeader}>
                        <Text style={styles.detailTableHeaderCell}>Berechnungsgrundlagen</Text>
                    </View>
                    <DetailRow
                        label="Basiswert Potsdam (Normaljahr)"
                        value={r.hasValue ? formatRangeDe(r.baseRangeMm, "mm/a") : "kein Literaturwert"}
                    />
                    {d && (
                        <DetailRow
                            label="Basiswert Potsdam (Trockenjahr)"
                            value={d.hasValue ? formatRangeDe(d.baseRangeMm, "mm/a") : "kein Literaturwert"}
                        />
                    )}
                    <DetailRow label="ΔKWB Standort" value={`${formatNumDe(r.deltaKwb, 1)} mm`} />
                    <DetailRow label="Korrektur (×rFaktor)" value={`${formatNumDe(r.correctionMm, 0)} mm`} />
                    {fa.irrigationPeriod && r.monthlyRows.length > 0 && (
                        <View style={styles.detailTableRow}>
                            <View style={{flex: 1, padding: 4}}>
                                <View style={styles.subtable}>
                                    <View style={styles.subtableHeaderRow}>
                                        <Text style={styles.subtableHeaderCellLeft}>Monat</Text>
                                        <Text style={styles.subtableHeaderCell}>N (mm)</Text>
                                        <Text style={styles.subtableHeaderCell}>ET₀</Text>
                                        <Text style={styles.subtableHeaderCell}>KWB</Text>
                                        <Text style={styles.subtableHeaderCell}>KWB_Ref</Text>
                                        <Text style={styles.subtableHeaderCell}>ΔKWB</Text>
                                    </View>
                                    {r.monthlyRows.map((row) => (
                                        <View key={row.label} style={styles.subtableRow}>
                                            <Text style={styles.subtableCellLeft}>{row.label}</Text>
                                            <Text style={styles.subtableCell}>{formatNumDe(row.precip, 0)}</Text>
                                            <Text style={styles.subtableCell}>{formatNumDe(row.et0, 0)}</Text>
                                            <Text style={styles.subtableCell}>{formatNumDe(row.localKwb, 0)}</Text>
                                            <Text style={styles.subtableCell}>{formatNumDe(row.refKwbVal, 0)}</Text>
                                            <Text style={styles.subtableCell}>{formatNumDe(row.weightedDelta, 1)}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>
                    )}
                </View>
                <SourceLine source={source} />
            </>
        );
    }

    if (module === "weinbau" && normal) {
        const r = normal as WeinbauResult;
        return (
            <>
                <View style={styles.detailTable}>
                    <View style={styles.detailTableHeader}>
                        <Text style={styles.detailTableHeaderCell}>Berechnungsgrundlagen</Text>
                    </View>
                    <DetailRow
                        label="nFKWe-Gruppe"
                        value={`${r.weinbauNFkwe}${r.isJunganlage ? " (Junganlage)" : ""}`}
                    />
                    <DetailRow label="Jahresniederschlag" value={`${formatNumDe(r.annualPrecipMm, 0)} mm`} />
                    <DetailRow label="Niederschlagsklasse" value={precipClassLabel(r.precipClass)} />
                    <DetailRow label="Tabelle" value={r.hasScenarioData ? "Tabelle 27 (Geisenheim)" : "Tabelle 26"} />
                </View>
                <SourceLine source={source} />
            </>
        );
    }

    if (module === "gruenflaechen" && normal) {
        const r = normal as GruenflaechenResult;
        return (
            <>
                <View style={styles.detailTable}>
                    <View style={styles.detailTableHeader}>
                        <Text style={styles.detailTableHeaderCell}>Berechnungsgrundlagen</Text>
                    </View>
                    <DetailRow
                        label={`Ø ET₀ im Zeitraum (${MONTH_NAMES[r.periodStart - 1]}–${MONTH_NAMES[r.periodEnd - 1]})`}
                        value={`${formatNumDe(r.avgDailyEt0, 2)} mm/d`}
                    />
                    <DetailRow
                        label={fa.fllVegetation
                            ? `Faktor L (${MOISTURE_OPTIONS.find(o => o.value === fa.fllMoisture)?.label ?? fa.fllMoisture})`
                            : "Faktor L (Lebensbereich)"}
                        value={String(r.factorL)}
                    />
                    <DetailRow
                        label={fa.fllVegetation
                            ? `Faktor G (${VEGETATION_OPTIONS.find(o => o.value === fa.fllVegetation)?.label ?? fa.fllVegetation})`
                            : "Faktor G (Vegetation)"}
                        value={String(r.factorG)}
                    />
                    <DetailRow
                        label={fa.fllSoil
                            ? `Faktor B (${SOIL_OPTIONS.find(o => o.value === fa.fllSoil)?.label ?? fa.fllSoil})`
                            : "Faktor B (Bodenart)"}
                        value={String(r.factorB)}
                    />
                    <DetailRow
                        label={fa.fllSun
                            ? `Faktor S (${SUN_OPTIONS.find(o => o.value === fa.fllSun)?.label ?? fa.fllSun})`
                            : "Faktor S (Sonne)"}
                        value={String(r.factorS)}
                    />
                    <DetailRowBold
                        label="Faktorprodukt (L×G×B×S)"
                        value={formatNumDe(r.factorProduct, 3)}
                    />
                    <DetailRowBold
                        label={`ET_t = ET₀ × ${formatNumDe(r.factorProduct, 3)}`}
                        value={`${formatNumDe(r.ettMmPerDay, 2)} mm/d`}
                    />
                    <DetailRow label="Zeitraum" value={`${r.periodDays} Tage`} />
                </View>
                <SourceLine source={source} />
            </>
        );
    }

    if ((module === "naturrasen" || module === "tennen") && normal) {
        const r = normal as NaturrasenResult | TennenResult;
        return (
            <>
                <View style={styles.detailTable}>
                    <View style={styles.detailTableHeader}>
                        <Text style={styles.detailTableHeaderCell}>Berechnungsgrundlagen</Text>
                    </View>
                    <DetailRow label="Jahresniederschlag" value={`${formatNumDe(r.annualPrecipMm, 0)} mm`} />
                    <DetailRow label="Niederschlagsklasse" value={precipClassLabel(r.precipClass)} />
                </View>
                <SourceLine source={source} />
            </>
        );
    }

    if (module === "golf" && normal) {
        const r = normal as GolfResult;
        return (
            <>
                <View style={styles.detailTable}>
                    <View style={styles.detailTableHeader}>
                        <Text style={styles.detailTableHeaderCell}>Berechnungsgrundlagen</Text>
                    </View>
                    <DetailRow label="Jahresniederschlag" value={`${formatNumDe(r.annualPrecipMm, 0)} mm`} />
                    <DetailRow label="Niederschlagsklasse" value={precipClassLabel(r.precipClass)} />
                    <View style={styles.detailTableRow}>
                        <View style={{flex: 1, padding: 4}}>
                            <View style={styles.subtable}>
                                <View style={styles.subtableHeaderRow}>
                                    <Text style={styles.subtableHeaderCellLeft}>Bereich</Text>
                                    <Text style={styles.subtableHeaderCell}>Fläche (m²)</Text>
                                    <Text style={styles.subtableHeaderCell}>ZWB (mm/a)</Text>
                                    <Text style={styles.subtableHeaderCell}>ZWB (m³/a)</Text>
                                </View>
                                <View style={styles.subtableRow}>
                                    <Text style={styles.subtableCellLeft}>Grüns/Vorgrüns</Text>
                                    <Text style={styles.subtableCell}>{formatNumDe(r.greens.areaM2, 0)}</Text>
                                    <Text style={styles.subtableCell}>{formatRangeDe(r.greens.rangeMmPerA, "mm/a")}</Text>
                                    <Text style={styles.subtableCell}>{formatRangeDe(r.greens.rangeM3, "m³/a")}</Text>
                                </View>
                                <View style={styles.subtableRow}>
                                    <Text style={styles.subtableCellLeft}>Abschläge/Tees</Text>
                                    <Text style={styles.subtableCell}>{formatNumDe(r.tees.areaM2, 0)}</Text>
                                    <Text style={styles.subtableCell}>{formatRangeDe(r.tees.rangeMmPerA, "mm/a")}</Text>
                                    <Text style={styles.subtableCell}>{formatRangeDe(r.tees.rangeM3, "m³/a")}</Text>
                                </View>
                                <View style={styles.subtableRow}>
                                    <Text style={styles.subtableCellLeft}>Spielbahnen/Fairways</Text>
                                    <Text style={styles.subtableCell}>{formatNumDe(r.fairways.areaM2, 0)}</Text>
                                    <Text style={styles.subtableCell}>{formatRangeDe(r.fairways.rangeMmPerA, "mm/a")}</Text>
                                    <Text style={styles.subtableCell}>{formatRangeDe(r.fairways.rangeM3, "m³/a")}</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
                <SourceLine source={source} />
            </>
        );
    }

    if (module === "kunstrasen" && normal) {
        const r = normal as KunstrasenResult;
        return (
            <>
                <View style={styles.detailTable}>
                    <View style={styles.detailTableHeader}>
                        <Text style={styles.detailTableHeaderCell}>Berechnungsgrundlagen</Text>
                    </View>
                    <DetailRow label="Fläche" value={`${r.areaHa} ha`} />
                    <DetailRow label="Wochen/Saison" value={String(r.weeks)} />
                    <DetailRow label="Intensität" value={`${r.mmPerWeek} mm/Woche`} />
                    <DetailRow
                        label="Formel"
                        value={`${r.weeks} × ${r.mmPerWeek} mm/Woche = ${r.annualMm} mm/a`}
                    />
                </View>
                <SourceLine source={source} />
            </>
        );
    }

    return null;
};
