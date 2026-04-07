// src/components/pdf/PdfZuschlaegeBlock.tsx
import {Text, View} from "@react-pdf/renderer";
import {styles} from "./PdfStyles";
import {formatNumDe} from "./pdfFormatNum";
import type {AssignmentResult} from "../../lib/calculations/getAssignmentResult";
import type {HauptkulturenResult} from "../../lib/calculations/hauptkulturen";
import type {GemueseObstResult} from "../../lib/calculations/gemueseObst";
import type {ModuleType} from "../../types/project";

interface Props {
    module: ModuleType;
    result: AssignmentResult;
}

export const PdfZuschlaegeBlock = ({module, result}: Props) => {
    if (module !== "hauptkulturen" && module !== "gemuese_obst") return null;

    const r = result.normal as HauptkulturenResult | GemueseObstResult | undefined;
    if (!r) return null;

    const rows: [string, string][] = [];

    if (module === "hauptkulturen") {
        const hk = r as HauptkulturenResult;
        if (hk.autoSurchargeMm > 0) {
            rows.push(["Automatisch (Kultur)", `+${formatNumDe(hk.autoSurchargeMm, 0)} mm`]);
        }
        if (hk.optionalSurchargeMm > 0) {
            rows.push(["Optionale Zuschläge", `+${formatNumDe(hk.optionalSurchargeMm, 0)} mm`]);
        }
    }

    if (module === "gemuese_obst") {
        const go = r as GemueseObstResult;
        if (go.optionalSurchargeMm > 0) {
            rows.push(["Weitere Zuschläge", `+${formatNumDe(go.optionalSurchargeMm, 0)} mm`]);
        }
    }

    if (rows.length === 0) return null;

    return (
        <View style={styles.detailTable}>
            <View style={styles.detailTableHeader}>
                <Text style={styles.detailTableHeaderCell}>Zuschläge</Text>
            </View>
            {rows.map(([label, value]) => (
                <View key={label} style={styles.detailTableRow}>
                    <Text style={styles.detailTableLabel}>{label}</Text>
                    <Text style={styles.detailTableValue}>{value}</Text>
                </View>
            ))}
        </View>
    );
};
