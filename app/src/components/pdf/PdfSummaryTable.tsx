// src/components/pdf/PdfSummaryTable.tsx
import {Text, View} from "@react-pdf/renderer";
import {styles} from "./PdfStyles";
import {formatNumDe, formatRangeDe} from "./pdfFormatNum";
import {getModuleLabel, fieldTerm, hasDryYearScenario} from "../../constants/modules";
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
        normalM3, dryM3, yearlyM3, yearlyCount, yearlyAssignedCount,
        totalAltWasserM3, nettoM3, nettoDryM3, nettoYearlyM3,
        totalAreaHa, pendingCount,
        normalCount, dryCount, scenarioAssignedCount,
    } = data;

    // Partial = a crop assignment has no literature value. Sport/green areas are
    // not counted here: they are summed separately, not missing from a scenario.
    const normalPartial = normalCount < scenarioAssignedCount;
    const dryPartial = dryCount < scenarioAssignedCount;
    const yearlyAltWasserM3 = assignmentResults.reduce(
        (sum, r) => sum + (r && !hasDryYearScenario(r.module) ? r.altWasserM3 ?? 0 : 0), 0);
    const cropAltWasserM3 = totalAltWasserM3 - yearlyAltWasserM3;

    // Adapt terminology to the project context (pure golf/sport projects: "Fläche")
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
                    // Sport/green: one Jahresrichtwert. @react-pdf has no colSpan, so
                    // the value stays in the Normaljahr column but is labelled, and the
                    // Trockenjahr cell says why it is empty instead of showing "–".
                    const scenarioFree = !!fa.module && !hasDryYearScenario(fa.module);

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
                                        {scenarioFree && (
                                            <Text style={styles.tableCellMuted}>Jahresrichtwert ‡</Text>
                                        )}
                                    </>
                                ) : (
                                    <Text style={styles.tableCellMuted}>
                                        {result?.normal ? "k. W." : "–"}
                                    </Text>
                                )}
                            </View>
                            <View style={{flex: COL.trocken, padding: 4, alignItems: "flex-end"}}>
                                {scenarioFree ? (
                                    <Text style={styles.tableCellMuted}>entfällt ‡</Text>
                                ) : dryHasValue && result?.dry ? (
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
                            <Text style={styles.twoLineSecondary}>{formatRangeDe(normalM3, "m³/a")}</Text>
                        ) : (
                            <Text style={styles.tableCellMuted}>–</Text>
                        )}
                    </View>
                    <View style={{flex: COL.trocken, padding: 4, alignItems: "flex-end"}}>
                        {dryM3 ? (
                            <Text style={styles.twoLineSecondary}>{formatRangeDe(dryM3, "m³/a")}</Text>
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
                    <Text style={styles.summaryRowValue}>{formatRangeDe(normalM3, "m³/a")}</Text>
                </View>
            )}
            {dryM3 && (
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryRowLabel}>Brutto Trockenjahr{dryPartial ? " *" : ""}</Text>
                    <Text style={styles.summaryRowValue}>{formatRangeDe(dryM3, "m³/a")}</Text>
                </View>
            )}
            {yearlyM3 && (
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryRowLabel}>
                        {"Brutto Jahresrichtwert ‡ ("}
                        {yearlyCount === yearlyAssignedCount
                            ? `${yearlyCount} ${yearlyCount === 1 ? "Sport-/Grünfläche" : "Sport-/Grünflächen"}`
                            : `${yearlyCount}/${yearlyAssignedCount} Sport-/Grünflächen`}
                        {")"}
                    </Text>
                    <Text style={styles.summaryRowValue}>{formatRangeDe(yearlyM3, "m³/a")}</Text>
                </View>
            )}
            {totalAltWasserM3 > 0 && (
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryRowLabel}>Alternative Wasserquellen</Text>
                    <Text style={styles.summaryRowAlt}>−{formatNumDe(totalAltWasserM3, 0)} m³/a</Text>
                </View>
            )}
            {nettoM3 && cropAltWasserM3 > 0 && (
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryRowLabel}>Netto-Antragsmenge (Normaljahr)</Text>
                    <Text style={styles.summaryRowNetto}>{formatRangeDe(nettoM3, "m³/a")}</Text>
                </View>
            )}
            {nettoDryM3 && cropAltWasserM3 > 0 && (
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryRowLabel}>Netto-Antragsmenge (Trockenjahr)</Text>
                    <Text style={styles.summaryRowNetto}>{formatRangeDe(nettoDryM3, "m³/a")}</Text>
                </View>
            )}
            {nettoYearlyM3 && yearlyAltWasserM3 > 0 && (
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryRowLabel}>Netto-Antragsmenge (Sport-/Grünflächen)</Text>
                    <Text style={styles.summaryRowNetto}>{formatRangeDe(nettoYearlyM3, "m³/a")}</Text>
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
                    {"* Summe umfasst nicht alle Kulturfl\u00E4chen"}
                    {normalPartial ? ` (Normaljahr: ${normalCount}/${scenarioAssignedCount})` : ""}
                    {dryPartial ? ` (Trockenjahr: ${dryCount}/${scenarioAssignedCount})` : ""}
                    {" \u2013 f\u00FCr einzelne Kulturen liegt kein Literaturwert vor."}
                    {cropAltWasserM3 > 0 ? " Netto-Antragsmenge wird nur bei vollst\u00E4ndigen Szenarien ausgewiesen." : ""}
                </Text>
            )}
            {yearlyM3 && (
                <Text style={[styles.sourceLine, {marginTop: 4}]}>
                    {"\u2021 Sport-, Gr\u00FCn- und Golffl\u00E4chen bemisst das Merkblatt nach Fl\u00E4che, "}
                    {"Niederschlag und Verdunstung und nennt daf\u00FCr einen einzelnen "}
                    {"Jahresrichtwert; ein Wert f\u00FCr das mittlere Trockenjahr existiert dort "}
                    {"nicht. Diese Fl\u00E4chen werden deshalb getrennt summiert und in keiner der "}
                    {"beiden Szenariosummen mitgez\u00E4hlt. F\u00FCr die Antragsmenge sind die Betr\u00E4ge "}
                    {"zu addieren."}
                </Text>
            )}
            <Text style={[styles.sourceLine, {marginTop: 4}]}>
                {"Normaljahr = Median der 30-j\u00E4hrigen KWBv-Reihe (50% Versorgungssicherheit); "}
                {"mittleres Trockenjahr = 20%-Perzentil (80% Versorgungssicherheit). "}
                {"Das Merkblatt empfiehlt das mittlere Trockenjahr als Bemessungsgrundlage f\u00FCr "}
                {"wasserrechtliche Gestattungen (DWA-M 590, Kapitel 3.5)."}
            </Text>
        </View>
    );
};
