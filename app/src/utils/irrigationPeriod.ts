// src/utils/irrigationPeriod.ts

import type {IrrigationBound, IrrigationMonth, MonthPosition} from "../types/project";

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
