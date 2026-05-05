// src/components/pdf/PdfErgebnisBlock.tsx
import {Image, Text, View} from "@react-pdf/renderer";
import {styles} from "./PdfStyles";
import {formatNumDe, formatRangeDe, formatOpenRangeDe} from "./pdfFormatNum";
import type {AssignmentResult} from "../../lib/calculations/getAssignmentResult";
import type {NaturrasenResult} from "../../lib/calculations/naturrasen";
import type {TennenResult} from "../../lib/calculations/tennen";

interface Props {
    result: AssignmentResult;
    iconNormalDataUrl: string;
    iconDryDataUrl: string;
}

export const PdfErgebnisBlock = ({result, iconNormalDataUrl, iconDryDataUrl}: Props) => {
    const normal = result.normal;
    const dry = result.dry;
    const normalHasValue = normal && (!("hasValue" in normal) || normal.hasValue);
    const dryHasValue = dry && (!("hasValue" in dry) || dry.hasValue);
    const isOpenRange = normal && "isOpenRange" in normal && (normal as NaturrasenResult | TennenResult).isOpenRange;
    const isUserCustom = !!(normal && "isUserCustom" in normal && normal.isUserCustom);

    return (
        <View style={styles.detailTable}>
            <View style={styles.detailTableHeader}>
                <Text style={styles.detailTableHeaderCell}>
                    {isUserCustom ? "Ergebnis (benutzerdefiniert)" : "Ergebnis"}
                </Text>
            </View>
            {normalHasValue && normal ? (
                <View style={styles.detailTableRow}>
                    <View style={[{flex: 2, flexDirection: "row", alignItems: "center", padding: 4}]}>
                        <Image src={iconNormalDataUrl} style={{width: 9, height: 9, marginRight: 3}} />
                        <Text style={{fontSize: 9, color: styles.detailTableLabel.color}}>Normaljahr</Text>
                    </View>
                    <View style={[{flex: 3, flexDirection: "row", alignItems: "baseline", padding: 4}]}>
                        <Text style={styles.summaryRowMma}>
                            {isOpenRange
                                ? formatOpenRangeDe(normal as NaturrasenResult | TennenResult, "mm/a")
                                : formatRangeDe(normal.totalRangeMm, "mm/a")
                            }{" · "}
                        </Text>
                        <Text style={[styles.detailTableValueBold, {padding: 0}]}>
                            {formatRangeDe(normal.totalRangeM3, "m³/a")}
                        </Text>
                    </View>
                </View>
            ) : normal ? (
                <View style={styles.detailTableRow}>
                    <View style={[{flex: 2, flexDirection: "row", alignItems: "center", padding: 4}]}>
                        <Image src={iconNormalDataUrl} style={{width: 9, height: 9, marginRight: 3}} />
                        <Text style={{fontSize: 9, color: styles.detailTableLabel.color}}>Normaljahr</Text>
                    </View>
                    <Text style={styles.detailTableValue}>Kein Literaturwert vorhanden</Text>
                </View>
            ) : null}
            {dryHasValue && dry ? (
                <View style={styles.detailTableRow}>
                    <View style={[{flex: 2, flexDirection: "row", alignItems: "center", padding: 4}]}>
                        <Image src={iconDryDataUrl} style={{width: 9, height: 9, marginRight: 3}} />
                        <Text style={{fontSize: 9, color: styles.detailTableLabel.color}}>Trockenjahr</Text>
                    </View>
                    <View style={[{flex: 3, flexDirection: "row", alignItems: "baseline", padding: 4}]}>
                        <Text style={styles.summaryRowMma}>
                            {formatRangeDe(dry.totalRangeMm, "mm/a")}{" · "}
                        </Text>
                        <Text style={[styles.detailTableValueBold, {padding: 0}]}>
                            {formatRangeDe(dry.totalRangeM3, "m³/a")}
                        </Text>
                    </View>
                </View>
            ) : dry ? (
                <View style={styles.detailTableRow}>
                    <View style={[{flex: 2, flexDirection: "row", alignItems: "center", padding: 4}]}>
                        <Image src={iconDryDataUrl} style={{width: 9, height: 9, marginRight: 3}} />
                        <Text style={{fontSize: 9, color: styles.detailTableLabel.color}}>Trockenjahr</Text>
                    </View>
                    <Text style={styles.detailTableValue}>Kein Literaturwert vorhanden</Text>
                </View>
            ) : null}
            {result.altWasserM3 != null && result.altWasserM3 > 0 && (
                <View style={styles.detailTableRow}>
                    <Text style={styles.detailTableLabel}>Alt. Wasserquellen</Text>
                    <Text style={styles.detailTableValue}>
                        {"–"}{formatNumDe(result.altWasserM3, 0)} m³/a
                    </Text>
                </View>
            )}
        </View>
    );
};
