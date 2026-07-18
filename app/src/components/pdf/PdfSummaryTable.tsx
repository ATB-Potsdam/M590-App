// src/components/pdf/PdfSummaryTable.tsx
import {Text, View} from "@react-pdf/renderer";
import {styles} from "./PdfStyles";
import {formatNumDe, formatRangeDe} from "./pdfFormatNum";
import {getModuleLabel, fieldTerm} from "../../constants/modules";
import type {SummaryPdfData} from "../../lib/generateSummaryPdf";

interface Props {
    data: SummaryPdfData;
}

// Flex proportions for columns
const COL = {
    schlag: 2.5,
    nutzung: 1.5,
    flaeche: 0.7,
    normal: 1.8,
    trocken: 1.8,
    altWasser: 1.2,
};

export const PdfSummaryTable = ({data}: Props) => {
    const {
        project, farm, assignmentResults,
        normalMm, normalM3, dryMm, dryM3,
        totalAltWasserM3, nettoM3, nettoMm, nettoDryM3, nettoDryMm,
        totalAreaHa, pendingCount,
        normalCount, dryCount,
    } = data;

    const assignedCount = project.fieldAssignments.filter(fa => fa.module).length;
    const normalPartial = normalCount < assignedCount;
    const dryPartial = dryCount < assignedCount;

    // Terminologie an Projektkontext anpassen (reine Golf-/Sport-Projekte: "Fläche")
    const projectModules = project.fieldAssignments.map((fa) => fa.module);
    const term = fieldTerm(projectModules);
    const termPlural = fieldTerm(projectModules, true);

    const showAltWasser = totalAltWasserM3 > 0;

    return (
        <View>
            <Text style={styles.sectionTitle}>Zusammenfassung</Text>

            {/* Main table */}
            <View style={styles.table}>
                {/* Header row */}
                <View style={styles.tableHeaderRow}>
                    <Text style={[styles.tableHeaderCell, {flex: COL.schlag}]}>{term}</Text>
                    <Text style={[styles.tableHeaderCell, {flex: COL.nutzung}]}>Nutzung</Text>
                    <Text style={[styles.tableHeaderCell, {flex: COL.flaeche, textAlign: "right"}]}>Fläche</Text>
                    <Text style={[styles.tableHeaderCell, {flex: COL.normal}]}>Normaljahr</Text>
                    <Text style={[styles.tableHeaderCell, {flex: COL.trocken}]}>Trockenjahr</Text>
                    {showAltWasser && (
                        <Text style={[styles.tableHeaderCell, {flex: COL.altWasser, textAlign: "right"}]}>Alt. Wasser</Text>
                    )}
                </View>

                {/* Data rows */}
                {project.fieldAssignments.map((fa, i) => {
                    const field = farm.fields.find(f => f.id === fa.fieldId);
                    if (!field) return null;
                    const result = assignmentResults[i];
                    const normalHasValue = result?.normal && (!("hasValue" in result.normal) || result.normal.hasValue);
                    const dryHasValue = result?.dry && (!("hasValue" in result.dry) || result.dry.hasValue);

                    return (
                        <View key={fa.id} style={styles.tableRow}>
                            <View style={[{flex: COL.schlag, padding: 4}]}>
                                <Text style={{fontSize: 9, fontFamily: "Roboto", fontWeight: "bold"}}>{field.name}</Text>
                            </View>
                            <View style={[{flex: COL.nutzung, padding: 4}]}>
                                <Text style={{fontSize: 9}}>
                                    {fa.module ? getModuleLabel(fa.module) : "–"}
                                </Text>
                                {fa.plantKey && (
                                    <Text style={{fontSize: 8, color: "#666"}}>
                                        {fa.plantKey.split("|").slice(0, 2).join(" · ")}
                                    </Text>
                                )}
                            </View>
                            <Text style={[styles.tableCell, {flex: COL.flaeche, textAlign: "right", alignSelf: "flex-start"}]}>
                                {formatNumDe(field.areaHa, 2)} ha
                            </Text>
                            <View style={{flex: COL.normal, padding: 4, alignItems: "flex-end"}}>
                                {normalHasValue && result?.normal ? (
                                    <>
                                        <Text style={styles.twoLineSecondary}>
                                            {formatRangeDe(result.normal.totalRangeM3, "m³/a")}
                                        </Text>
                                        <Text style={styles.twoLinePrimary}>
                                            {formatRangeDe(result.normal.totalRangeMm, "mm/a")}
                                        </Text>
                                    </>
                                ) : (
                                    <Text style={styles.tableCellMuted}>
                                        {result?.normal ? "k. W." : "–"}
                                    </Text>
                                )}
                            </View>
                            <View style={{flex: COL.trocken, padding: 4, alignItems: "flex-end"}}>
                                {dryHasValue && result?.dry ? (
                                    <>
                                        <Text style={styles.twoLineSecondary}>
                                            {formatRangeDe(result.dry.totalRangeM3, "m³/a")}
                                        </Text>
                                        <Text style={styles.twoLinePrimary}>
                                            {formatRangeDe(result.dry.totalRangeMm, "mm/a")}
                                        </Text>
                                    </>
                                ) : (
                                    <Text style={styles.tableCellMuted}>
                                        {result?.dry ? "k. W." : "–"}
                                    </Text>
                                )}
                            </View>
                            {showAltWasser && (
                                <Text style={[styles.tableCell, {flex: COL.altWasser, textAlign: "right"}]}>
                                    {result?.altWasserM3 ? `−${formatNumDe(result.altWasserM3, 0)} m³/a` : "–"}
                                </Text>
                            )}
                        </View>
                    );
                })}

                {/* Footer row */}
                <View style={styles.tableFooterRow}>
                    <Text style={[styles.tableCellBold, {flex: COL.schlag}]}>
                        Gesamt ({project.fieldAssignments.length} {termPlural})
                    </Text>
                    <Text style={[styles.tableCell, {flex: COL.nutzung}]} />
                    <Text style={[styles.tableCellBold, {flex: COL.flaeche, textAlign: "right"}]}>
                        {formatNumDe(totalAreaHa, 2)} ha
                    </Text>
                    <View style={{flex: COL.normal, padding: 4, alignItems: "flex-end"}}>
                        {normalM3 ? (
                            <>
                                <Text style={styles.twoLineSecondary}>{formatRangeDe(normalM3, "m³/a")}</Text>
                                {normalMm && <Text style={styles.twoLinePrimary}>{formatRangeDe(normalMm, "mm/a")}</Text>}
                            </>
                        ) : (
                            <Text style={styles.tableCellMuted}>–</Text>
                        )}
                    </View>
                    <View style={{flex: COL.trocken, padding: 4, alignItems: "flex-end"}}>
                        {dryM3 ? (
                            <>
                                <Text style={styles.twoLineSecondary}>{formatRangeDe(dryM3, "m³/a")}</Text>
                                {dryMm && <Text style={styles.twoLinePrimary}>{formatRangeDe(dryMm, "mm/a")}</Text>}
                            </>
                        ) : (
                            <Text style={styles.tableCellMuted}>–</Text>
                        )}
                    </View>
                    {showAltWasser && (
                        <Text style={[styles.tableCellBold, {flex: COL.altWasser, textAlign: "right"}]}>
                            −{formatNumDe(totalAltWasserM3, 0)} m³/a
                        </Text>
                    )}
                </View>
            </View>

            {/* Summary result rows */}
            {normalM3 && (
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryRowLabel}>Brutto Normaljahr{normalPartial ? " *" : ""}</Text>
                    <View style={{flexDirection: "column", alignItems: "flex-end"}}>
                        <Text style={styles.summaryRowValue}>{formatRangeDe(normalM3, "m³/a")}</Text>
                        {normalMm && <Text style={styles.summaryRowMma}>{formatRangeDe(normalMm, "mm/a")}</Text>}
                    </View>
                </View>
            )}
            {dryM3 && (
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryRowLabel}>Brutto Trockenjahr{dryPartial ? " *" : ""}</Text>
                    <View style={{flexDirection: "column", alignItems: "flex-end"}}>
                        <Text style={styles.summaryRowValue}>{formatRangeDe(dryM3, "m³/a")}</Text>
                        {dryMm && <Text style={styles.summaryRowMma}>{formatRangeDe(dryMm, "mm/a")}</Text>}
                    </View>
                </View>
            )}
            {totalAltWasserM3 > 0 && (
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryRowLabel}>Alternative Wasserquellen</Text>
                    <Text style={styles.summaryRowAlt}>−{formatNumDe(totalAltWasserM3, 0)} m³/a</Text>
                </View>
            )}
            {nettoM3 && totalAltWasserM3 > 0 && (
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryRowLabel}>Netto-Antragsmenge (Normaljahr)</Text>
                    <View style={{flexDirection: "column", alignItems: "flex-end"}}>
                        <Text style={styles.summaryRowNetto}>{formatRangeDe(nettoM3, "m³/a")}</Text>
                        {nettoMm && <Text style={styles.summaryRowMma}>{formatRangeDe(nettoMm, "mm/a")}</Text>}
                    </View>
                </View>
            )}
            {nettoDryM3 && totalAltWasserM3 > 0 && (
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryRowLabel}>Netto-Antragsmenge (Trockenjahr)</Text>
                    <View style={{flexDirection: "column", alignItems: "flex-end"}}>
                        <Text style={styles.summaryRowNetto}>{formatRangeDe(nettoDryM3, "m³/a")}</Text>
                        {nettoDryMm && <Text style={styles.summaryRowMma}>{formatRangeDe(nettoDryMm, "mm/a")}</Text>}
                    </View>
                </View>
            )}
            {pendingCount > 0 && (
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryRowLabel}>Ohne Nutzung</Text>
                    <Text style={styles.summaryRowValue}>{pendingCount} {pendingCount === 1 ? term : termPlural}</Text>
                </View>
            )}
            {(normalPartial || dryPartial) && (
                <Text style={[styles.sourceLine, {marginTop: 4}]}>
                    {`* Summe umfasst nicht alle ${termPlural}`}
                    {normalPartial ? ` (Normaljahr: ${normalCount}/${assignedCount})` : ""}
                    {dryPartial ? ` (Trockenjahr: ${dryCount}/${assignedCount})` : ""}
                    {" \u2013 nicht alle Nutzungen liefern beide Szenariowerte."}
                    {totalAltWasserM3 > 0 ? " Netto-Antragsmenge wird nur bei vollst\u00E4ndigen Szenarien ausgewiesen." : ""}
                </Text>
            )}
        </View>
    );
};
