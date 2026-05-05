// src/components/pdf/PdfSummaryTable.tsx
import {Image, Text, View} from "@react-pdf/renderer";
import {styles} from "./PdfStyles";
import {formatNumDe, formatRangeDe} from "./pdfFormatNum";
import {getModuleLabel} from "../../constants/modules";
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
        iconNormalDataUrl, iconDryDataUrl,
    } = data;

    const assignedCount = project.fieldAssignments.filter(fa => fa.module).length;
    const normalPartial = normalCount < assignedCount;
    const dryPartial = dryCount < assignedCount;

    const showAltWasser = totalAltWasserM3 > 0;

    return (
        <View>
            <Text style={styles.sectionTitle}>Zusammenfassung</Text>

            {/* Main table */}
            <View style={styles.table}>
                {/* Header row */}
                <View style={styles.tableHeaderRow}>
                    <Text style={[styles.tableHeaderCell, {flex: COL.schlag}]}>Schlag</Text>
                    <Text style={[styles.tableHeaderCell, {flex: COL.nutzung}]}>Nutzung</Text>
                    <Text style={[styles.tableHeaderCell, {flex: COL.flaeche, textAlign: "right"}]}>Fläche</Text>
                    <View style={[{flex: COL.normal, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", padding: 4}]}>
                        <Image src={iconNormalDataUrl} style={{width: 10, height: 10, marginRight: 3}} />
                        <Text style={{fontSize: 8, fontFamily: "Helvetica-Bold", color: styles.tableHeaderCell.color}}>Normaljahr</Text>
                    </View>
                    <View style={[{flex: COL.trocken, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", padding: 4}]}>
                        <Image src={iconDryDataUrl} style={{width: 10, height: 10, marginRight: 3}} />
                        <Text style={{fontSize: 8, fontFamily: "Helvetica-Bold", color: styles.tableHeaderCell.color}}>Trockenjahr</Text>
                    </View>
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
                                <Text style={{fontSize: 9, fontFamily: "Helvetica-Bold"}}>{field.name}</Text>
                                {fa.plantKey && (
                                    <Text style={{fontSize: 8, color: "#666"}}>
                                        {fa.plantKey.split("|").slice(0, 2).join(" · ")}
                                    </Text>
                                )}
                            </View>
                            <Text style={[styles.tableCell, {flex: COL.nutzung, alignSelf: "flex-start"}]}>
                                {fa.module ? getModuleLabel(fa.module) : "–"}
                            </Text>
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
                                    {result?.altWasserM3 ? `${formatNumDe(result.altWasserM3, 0)} m³/a` : "–"}
                                </Text>
                            )}
                        </View>
                    );
                })}

                {/* Footer row */}
                <View style={styles.tableFooterRow}>
                    <Text style={[styles.tableCellBold, {flex: COL.schlag}]}>
                        Gesamt ({project.fieldAssignments.length} Schläge)
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
                            {formatNumDe(totalAltWasserM3, 0)} m³/a
                        </Text>
                    )}
                </View>
            </View>

            {/* Summary result rows */}
            {normalM3 && (
                <View style={styles.summaryRow}>
                    <View style={{flexDirection: "row", alignItems: "center"}}>
                        <Image src={iconNormalDataUrl} style={{width: 10, height: 10, marginRight: 4}} />
                        <Text style={styles.summaryRowLabel}>Brutto Normaljahr{normalPartial ? " *" : ""}</Text>
                    </View>
                    <View style={{flexDirection: "row", alignItems: "baseline"}}>
                        {normalMm && <Text style={styles.summaryRowMma}>{formatRangeDe(normalMm, "mm/a")} · </Text>}
                        <Text style={styles.summaryRowValue}>{formatRangeDe(normalM3, "m³/a")}</Text>
                    </View>
                </View>
            )}
            {dryM3 && (
                <View style={styles.summaryRow}>
                    <View style={{flexDirection: "row", alignItems: "center"}}>
                        <Image src={iconDryDataUrl} style={{width: 10, height: 10, marginRight: 4}} />
                        <Text style={styles.summaryRowLabel}>Brutto Trockenjahr{dryPartial ? " *" : ""}</Text>
                    </View>
                    <View style={{flexDirection: "row", alignItems: "baseline"}}>
                        {dryMm && <Text style={styles.summaryRowMma}>{formatRangeDe(dryMm, "mm/a")} · </Text>}
                        <Text style={styles.summaryRowValue}>{formatRangeDe(dryM3, "m³/a")}</Text>
                    </View>
                </View>
            )}
            {totalAltWasserM3 > 0 && (
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryRowLabel}>– Alternative Wasserquellen</Text>
                    <Text style={styles.summaryRowAlt}>{formatNumDe(totalAltWasserM3, 0)} m³/a</Text>
                </View>
            )}
            {nettoM3 && totalAltWasserM3 > 0 && (
                <View style={styles.summaryRow}>
                    <View style={{flexDirection: "row", alignItems: "center"}}>
                        <Image src={iconNormalDataUrl} style={{width: 10, height: 10, marginRight: 4}} />
                        <Text style={styles.summaryRowLabel}>Netto-Antragsmenge (Normaljahr)</Text>
                    </View>
                    <View style={{flexDirection: "row", alignItems: "baseline"}}>
                        {nettoMm && <Text style={styles.summaryRowMma}>{formatRangeDe(nettoMm, "mm/a")} · </Text>}
                        <Text style={styles.summaryRowNetto}>{formatRangeDe(nettoM3, "m³/a")}</Text>
                    </View>
                </View>
            )}
            {nettoDryM3 && totalAltWasserM3 > 0 && (
                <View style={styles.summaryRow}>
                    <View style={{flexDirection: "row", alignItems: "center"}}>
                        <Image src={iconDryDataUrl} style={{width: 10, height: 10, marginRight: 4}} />
                        <Text style={styles.summaryRowLabel}>Netto-Antragsmenge (Trockenjahr)</Text>
                    </View>
                    <View style={{flexDirection: "row", alignItems: "baseline"}}>
                        {nettoDryMm && <Text style={styles.summaryRowMma}>{formatRangeDe(nettoDryMm, "mm/a")} · </Text>}
                        <Text style={styles.summaryRowNetto}>{formatRangeDe(nettoDryM3, "m³/a")}</Text>
                    </View>
                </View>
            )}
            {pendingCount > 0 && (
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryRowLabel}>Ohne Nutzung</Text>
                    <Text style={styles.summaryRowValue}>{pendingCount} Schlag/Schläge</Text>
                </View>
            )}
            {(normalPartial || dryPartial) && (
                <Text style={[styles.sourceLine, {marginTop: 4}]}>
                    {"* Summe umfasst nicht alle Schläge"}
                    {normalPartial ? ` (Normaljahr: ${normalCount}/${assignedCount})` : ""}
                    {dryPartial ? ` (Trockenjahr: ${dryCount}/${assignedCount})` : ""}
                    {" \u2013 nicht alle Nutzungen liefern beide Szenariowerte. Netto-Antragsmenge wird nur bei vollst\u00E4ndigen Szenarien ausgewiesen."}
                </Text>
            )}
        </View>
    );
};
