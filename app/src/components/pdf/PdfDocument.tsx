// src/components/pdf/PdfDocument.tsx
import {Document, Page, Text} from "@react-pdf/renderer";
import {styles} from "./PdfStyles";
import {PdfPageHeader} from "./PdfPageHeader";
import {PdfSummaryTable} from "./PdfSummaryTable";
import {PdfFieldDetail} from "./PdfFieldDetail";
import type {SummaryPdfData} from "../../lib/generateSummaryPdf";

interface Props {
    data: SummaryPdfData;
}

export const PdfDocument = ({data}: Props) => {
    const {project, farm, assignmentResults, iconNormalDataUrl, iconDryDataUrl, iconAltWasserDataUrl} = data;

    const detailItems = project.fieldAssignments
        .map((fa, i) => ({
            fa,
            field: farm.fields.find(f => f.id === fa.fieldId),
            result: assignmentResults[i],
            index: i + 1,
        }))
        .filter((item): item is typeof item & {field: NonNullable<typeof item.field>} =>
            item.field != null && item.fa.module != null && item.result != null
        );

    const pageNumberText = ({pageNumber, totalPages}: {pageNumber: number; totalPages: number}) =>
        `Seite ${pageNumber} von ${totalPages}`;

    return (
        <Document title={project.name} author="DWA-App M 590" language="de">
            {/* Page 1: summary */}
            <Page size="A4" style={styles.page}>
                <PdfPageHeader data={data} />
                <PdfSummaryTable data={data} />
                <Text
                    style={styles.pageNumber}
                    render={pageNumberText}
                    fixed
                />
            </Page>

            {/* One page per field assignment with a result */}
            {detailItems.map(({fa, field, result, index}) => (
                <Page key={fa.id} size="A4" style={styles.page}>
                    <PdfPageHeader data={data} />
                    <PdfFieldDetail
                        field={field}
                        assignment={fa}
                        result={result!}
                        index={index}
                        iconNormalDataUrl={iconNormalDataUrl}
                        iconDryDataUrl={iconDryDataUrl}
                        iconAltWasserDataUrl={iconAltWasserDataUrl}
                    />
                    <Text
                        style={styles.pageNumber}
                        render={pageNumberText}
                        fixed
                    />
                </Page>
            ))}
        </Document>
    );
};
