// src/components/pdf/pdfFormatNum.ts
// Locale-safe number formatters for use in react-pdf components.
// react-pdf renders in a worker context where undefined locale may not give German formatting.
// These always use 'de-DE' explicitly.

/** Format a number with German locale (comma as decimal separator). */
export const formatNumDe = (value: number, decimals: number): string =>
    value.toLocaleString("de-DE", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });

/** Format a [min, max] range with German locale. */
export const formatRangeDe = ([min, max]: [number, number], unit: string): string =>
    min === max
        ? `${formatNumDe(min, 0)} ${unit}`
        : `${formatNumDe(min, 0)}–${formatNumDe(max, 0)} ${unit}`;

/** Format an open range (> value) for naturrasen/tennen results. */
export const formatOpenRangeDe = (
    result: {isOpenRange: boolean; totalRangeMm: [number, number]},
    unit: string
): string => {
    if (result.isOpenRange) return `> ${formatNumDe(result.totalRangeMm[0], 0)} ${unit}`;
    return formatRangeDe(result.totalRangeMm, unit);
};
