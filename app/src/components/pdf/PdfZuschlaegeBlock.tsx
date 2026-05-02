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

    if (r.isUserCustom) {
        rows.push(["Basis", `${formatNumDe(r.userCustomMm, 0)} mm/a (benutzerdefiniert)`]);
    }

    if (module === "hauptkulturen") {
        const hk = r as HauptkulturenResult;
        if (hk.autoSurchargeMm > 0) {
            const label = hk.autoSurchargeLabel ? `Automatisch: ${hk.autoSurchargeLabel}` : "Automatisch (Kultur)";
            rows.push([label, `+${formatNumDe(hk.autoSurchargeMm, 0)} mm`]);
        }
        if (hk.surchargeIntermediateMm > 0) {
            rows.push(["Zwischenfrucht", `+${formatNumDe(hk.surchargeIntermediateMm, 0)} mm`]);
        }
        if (hk.surchargeEmergenceMm > 0) {
            rows.push(["Auflaufbewässerung", `+${formatNumDe(hk.surchargeEmergenceMm, 0)} mm`]);
        }
        if (hk.surchargeHeavySoilMm > 0) {
            rows.push(["Schwere Böden", `+${formatNumDe(hk.surchargeHeavySoilMm, 0)} mm`]);
        }
    }

    if (module === "gemuese_obst") {
        const go = r as GemueseObstResult;
        if (go.surchargeEmergenceMm > 0) {
            rows.push(["Auflaufbewässerung", `+${formatNumDe(go.surchargeEmergenceMm, 0)} mm`]);
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
