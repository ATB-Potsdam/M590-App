// src/components/pdf/PdfPageHeader.tsx
import {Image, Text, View} from "@react-pdf/renderer";
import {styles} from "./PdfStyles";
import type {SummaryPdfData} from "../../lib/generateSummaryPdf";

interface Props {
    data: SummaryPdfData;
}

export const PdfPageHeader = ({data}: Props) => {
    const {project, farm, logoAtbDataUrl, logoDwaDataUrl, createdDateStr} = data;
    return (
        <View style={styles.header} fixed>
            <View style={styles.headerLogosRow}>
                <Image src={logoAtbDataUrl} style={styles.headerLogo} />
                <Text style={styles.headerAppTitle}>DWA-App (M 590)</Text>
                <Image src={logoDwaDataUrl} style={styles.headerLogo} />
            </View>
            <Text style={styles.headerProjectName}>{project.name}</Text>
            <Text style={styles.headerMeta}>
                {farm.name}{project.description ? ` · ${project.description}` : ""} · Erstellt: {createdDateStr}
            </Text>
            <View style={styles.headerDivider} />
        </View>
    );
};
