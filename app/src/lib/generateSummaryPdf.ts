// src/lib/generateSummaryPdf.ts
import React from "react";
import {pdf, type DocumentProps} from "@react-pdf/renderer";
import {PdfDocument} from "../components/pdf/PdfDocument";
import {registerPdfFonts} from "../components/pdf/registerPdfFonts";
import type {JSXElementConstructor, ReactElement} from "react";
import type {Farm} from "../types/farm";
import type {Project} from "../types/project";
import type {AssignmentResult} from "./calculations/getAssignmentResult";
import {isNative, nativeShareFile} from "./nativeShare";

export interface SummaryPdfData {
    project: Project;
    farm: Farm;
    assignmentResults: (AssignmentResult | null)[];
    // Pre-computed totals from sumResults()
    normalMm: [number, number] | null;
    normalM3: [number, number] | null;
    dryMm: [number, number] | null;
    dryM3: [number, number] | null;
    totalAltWasserM3: number;
    nettoM3: [number, number] | null;
    nettoMm: [number, number] | null;
    nettoDryM3: [number, number] | null;
    nettoDryMm: [number, number] | null;
    // Derived scalars
    totalAreaHa: number;
    pendingCount: number;
    // How many assignments contribute to each scenario total (for footnote)
    normalCount: number;
    dryCount: number;
    // Pre-rasterized logos as PNG data URIs
    logoAtbDataUrl: string;
    logoDwaDataUrl: string;
    // Pre-rasterized emoji icons for Normal/Dry year labels
    iconNormalDataUrl: string;
    iconDryDataUrl: string;
    // Formatted creation date string
    createdDateStr: string;
}

export const generateSummaryPdf = (data: SummaryPdfData, filename: string): Promise<File> => {
    registerPdfFonts();
    return pdf(React.createElement(PdfDocument, {data}) as ReactElement<DocumentProps, string | JSXElementConstructor<unknown>>)
        .toBlob()
        .then((blob: Blob) => new File([blob], filename, {type: "application/pdf"}));
};

/** Share via native share sheet on Android/iOS, open in new tab on desktop. */
export const sharePdf = (file: File): Promise<"shared" | "opened"> => {
    if (isNative()) {
        return nativeShareFile(file).then(() => "shared" as const);
    }
    const url = URL.createObjectURL(file);
    window.open(url, "_blank");
    return Promise.resolve("opened");
};
