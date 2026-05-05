// src/components/pdf/PdfStyles.ts
import {StyleSheet} from "@react-pdf/renderer";

// Colors extracted from src/variables.scss (react-pdf cannot use CSS custom properties)
export const C = {
    text: "#213547",
    textSecondary: "#555",
    textMuted: "#888",
    bgSurface: "#f5f5f5",
    borderLight: "#e8e8e8",
    borderMedium: "#ccc",
    primary: "#2e7d32",
    warning: "#e65100",
    white: "#ffffff",
    black: "#000000",
} as const;

export const styles = StyleSheet.create({
    page: {
        paddingTop: 28,
        paddingBottom: 28,
        paddingHorizontal: 28,
        fontSize: 10,
        color: C.text,
        backgroundColor: C.white,
        fontFamily: "Helvetica",
    },

    // --- Page header ---
    header: {
        marginBottom: 10,
    },
    headerLogosRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 6,
    },
    headerLogo: {
        height: 28,
        objectFit: "contain",
    },
    headerAppTitle: {
        fontSize: 9,
        color: C.textSecondary,
    },
    headerProjectName: {
        fontSize: 15,
        fontFamily: "Helvetica-Bold",
        marginBottom: 2,
        color: C.text,
    },
    headerMeta: {
        fontSize: 9,
        color: C.textSecondary,
        marginBottom: 2,
    },
    headerDescription: {
        fontSize: 9,
        color: C.textSecondary,
        marginBottom: 1,
    },
    headerDivider: {
        borderBottomWidth: 1,
        borderBottomColor: C.borderMedium,
        marginTop: 6,
        marginBottom: 10,
    },

    // --- Section title ---
    sectionTitle: {
        fontSize: 13,
        fontFamily: "Helvetica-Bold",
        marginBottom: 8,
        color: C.text,
    },

    // --- Generic table (View-based) ---
    table: {
        width: "100%",
        marginBottom: 8,
        borderWidth: 1,
        borderColor: C.borderLight,
    },
    tableHeaderRow: {
        flexDirection: "row",
        backgroundColor: C.bgSurface,
        borderBottomWidth: 1,
        borderBottomColor: C.borderLight,
    },
    tableRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: C.borderLight,
    },
    tableFooterRow: {
        flexDirection: "row",
        borderTopWidth: 1,
        borderTopColor: C.borderMedium,
        backgroundColor: C.bgSurface,
    },
    tableHeaderCell: {
        fontSize: 8,
        fontFamily: "Helvetica-Bold",
        padding: 4,
        color: C.textSecondary,
    },
    tableCell: {
        fontSize: 9,
        padding: 4,
        color: C.text,
    },
    tableCellBold: {
        fontSize: 9,
        padding: 4,
        fontFamily: "Helvetica-Bold",
        color: C.text,
    },
    tableCellResult: {
        fontSize: 9,
        padding: 4,
        fontFamily: "Helvetica-Bold",
        color: C.primary,
    },
    tableCellMuted: {
        fontSize: 9,
        padding: 4,
        color: C.textMuted,
    },

    // --- Two-line cell (mm/a secondary on top, m³/a bold primary below) ---
    twoLineCell: {
        flexDirection: "column",
    },
    twoLinePrimary: {
        fontSize: 8,
        color: C.textSecondary,
    },
    twoLineSecondary: {
        fontSize: 9,
        fontFamily: "Helvetica-Bold",
        color: C.text,
    },

    // --- Summary result rows (below the main table) ---
    summaryRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 3,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: C.borderLight,
    },
    summaryRowLabel: {
        fontSize: 9,
        color: C.textSecondary,
    },
    summaryRowMma: {
        fontSize: 8,
        color: C.textSecondary,
    },
    summaryRowValue: {
        fontSize: 9,
        fontFamily: "Helvetica-Bold",
        color: C.primary,
    },
    summaryRowAlt: {
        fontSize: 9,
        fontFamily: "Helvetica-Bold",
        color: C.warning,
    },
    summaryRowNetto: {
        fontSize: 9,
        fontFamily: "Helvetica-Bold",
        color: C.primary,
    },

    // --- Detail block (per-field) ---
    detailTitle: {
        fontSize: 11,
        fontFamily: "Helvetica-Bold",
        marginBottom: 6,
        color: C.text,
    },

    // --- Detail sub-table (two-column key/value) ---
    detailTable: {
        width: "100%",
        marginBottom: 6,
        borderWidth: 1,
        borderColor: C.borderLight,
    },
    detailTableHeader: {
        flexDirection: "row",
        backgroundColor: C.bgSurface,
        borderBottomWidth: 1,
        borderBottomColor: C.borderLight,
    },
    detailTableHeaderCell: {
        fontSize: 9,
        fontFamily: "Helvetica-Bold",
        padding: 4,
        color: C.textSecondary,
        flex: 1,
    },
    detailTableRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: C.borderLight,
    },
    detailTableLabel: {
        fontSize: 9,
        padding: 4,
        color: C.textSecondary,
        flex: 2,
    },
    detailTableValue: {
        fontSize: 9,
        padding: 4,
        color: C.text,
        flex: 3,
    },
    detailTableValueBold: {
        fontSize: 9,
        padding: 4,
        fontFamily: "Helvetica-Bold",
        color: C.primary,
        flex: 3,
    },

    // --- Source citation ---
    sourceLine: {
        fontSize: 8,
        fontFamily: "Helvetica-Oblique",
        color: C.textMuted,
        marginBottom: 6,
        paddingHorizontal: 2,
    },

    // --- Subtable (gemuese_obst monthly rows, golf sub-areas) ---
    subtable: {
        marginTop: 2,
        marginBottom: 2,
        borderWidth: 1,
        borderColor: C.borderLight,
        width: "100%",
    },
    subtableHeaderRow: {
        flexDirection: "row",
        backgroundColor: C.bgSurface,
        borderBottomWidth: 1,
        borderBottomColor: C.borderLight,
    },
    subtableRow: {
        flexDirection: "row",
        borderBottomWidth: 1,
        borderBottomColor: C.borderLight,
    },
    subtableHeaderCell: {
        fontSize: 8,
        fontFamily: "Helvetica-Bold",
        padding: 3,
        color: C.textSecondary,
        flex: 1,
        textAlign: "right",
    },
    subtableHeaderCellLeft: {
        fontSize: 8,
        fontFamily: "Helvetica-Bold",
        padding: 3,
        color: C.textSecondary,
        flex: 1,
        textAlign: "left",
    },
    subtableCell: {
        fontSize: 8,
        padding: 3,
        color: C.text,
        flex: 1,
        textAlign: "right",
    },
    subtableCellLeft: {
        fontSize: 8,
        padding: 3,
        color: C.text,
        flex: 1,
        textAlign: "left",
    },

    // --- Page number (fixed at bottom) ---
    pageNumber: {
        position: "absolute",
        bottom: 14,
        left: 0,
        right: 0,
        textAlign: "center",
        fontSize: 8,
        color: C.textMuted,
    },
});
