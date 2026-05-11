// src/utils/irrigationPeriod.ts

import type {Range} from "../types/dataTypes";
import type {IrrigationBound, IrrigationMonth, IrrigationPeriod, MonthPosition} from "../types/project";

export const MONTHS: {value: IrrigationMonth; label: string;}[] = [
    {value: 3, label: "März"},
    {value: 4, label: "April"},
    {value: 5, label: "Mai"},
    {value: 6, label: "Juni"},
    {value: 7, label: "Juli"},
    {value: 8, label: "August"},
    {value: 9, label: "September"},
    {value: 10, label: "Oktober"},
];

export const POSITIONS: {value: MonthPosition; label: string;}[] = [
    {value: "full", label: "Ganzer Monat"},
    {value: "early", label: "Anfang"},
    {value: "mid", label: "Mitte"},
    {value: "late", label: "Ende"},
];

export const boundToLabel = (b: IrrigationBound): string => {
    const month = MONTHS.find((m) => m.value === b.month)?.label ?? "";
    if (b.position === "full") return month;
    const pos = POSITIONS.find((p) => p.value === b.position)?.label ?? "";
    return `${pos} ${month}`;
};

// Vergleich: ist bound A vor/gleich bound B?
export const boundIndex = (b: IrrigationBound): number =>
    (b.month - 3) * 4 + ["early", "mid", "late", "full"].indexOf(b.position);

export const isValidPeriod = (from: IrrigationBound, to: IrrigationBound): boolean =>
    boundIndex(from) <= boundIndex(to);

const getPosition = (month: number): MonthPosition => {
    const frac = month % 1;
    if (frac > .7) return "late";
    if (frac > .4) return "mid";
    if (frac > .2) return "early";
    return "full";
};

export const timeRangeToPeriod = (time: Range): IrrigationPeriod => {
    const from: IrrigationBound = {month: Math.floor(time[0]) as IrrigationMonth, position: getPosition(time[0])};
    const to: IrrigationBound = {month: Math.floor(time[1] + .9) as IrrigationMonth, position: getPosition(time[1])};
    return {from, to};
};

export const periodToKey = (period: IrrigationPeriod): string => {
    return `${period.from.month}-${period.from.position}-${period.to.month}-${period.to.position}`;
};

export const formatPeriod = (period: IrrigationPeriod): string => {
    const from = boundToLabel(period.from);
    const to = boundToLabel(period.to);
    return from === to ? from : `${from} – ${to}`;
};

// monthNames: 0-indexed array of month name strings (length 12)
export const formatMonthRange = (start: number, end: number, monthNames: string[]): string => {
    const from = monthNames[start - 1];
    const to = monthNames[end - 1];
    return from === to ? from : `${from} – ${to}`;
};