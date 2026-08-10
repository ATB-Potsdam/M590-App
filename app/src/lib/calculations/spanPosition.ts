import type {Range} from "../../types/dataTypes";

/**
 * Position within a literature span: 0 = minimum, 0.5 = mean, 1 = maximum.
 * `undefined` keeps the full span, which is the previous behaviour.
 */
export type SpanPosition = number;

export const SPAN_POSITIONS: {value: SpanPosition; label: string;}[] = [
    {value: 0, label: "Minimum"},
    {value: 0.5, label: "Mittelwert"},
    {value: 1, label: "Maximum"},
];

/**
 * Collapse a literature span to a single value.
 *
 * The Merkblatt explicitly allows this (Kapitel 4.2.2): "Für die wasserrechtliche
 * Beantragung des Zusatzwasserbedarfs können pauschalierte Werte innerhalb der
 * angegebenen Spannen … herangezogen werden."
 *
 * Returns a Range with min === max so that every consumer keeps working
 * unchanged — formatRange() already prints a single number in that case, and
 * sumResults() adds min-to-min / max-to-max, which stays correct.
 *
 * Returns the input untouched when no position is set or the span is already a
 * point value.
 */
export const applySpanPosition = (range: Range, position?: SpanPosition): Range => {
    if (position === undefined) return range;
    const [min, max] = range;
    if (min === max) return range;
    const value = Math.round(min + (max - min) * position);
    return [value, value];
};
