import type {IrrigationPeriod} from "../../types/project";

// Gewichtung: welchen Anteil eines Monats eine Bound abdeckt
const POSITION_WEIGHT_START: Record<string, number> = {
    early: 0.75,  // Anfang = ab ~1/4 des Monats → 3/4 verbleiben
    mid: 0.5,
    late: 0.25,
    full: 1,
};

const POSITION_WEIGHT_END: Record<string, number> = {
    early: 0.25,
    mid: 0.5,
    late: 0.75,
    full: 1,
};

// Gibt für jeden Kalendermonat (1–12) den Anteil zurück der im Zeitraum liegt
export const getMonthWeights = (period: IrrigationPeriod): Partial<Record<number, number>> => {
    const {from, to} = period;
    const weights: Partial<Record<number, number>> = {};

    for (let m = from.month; m <= to.month; m++) {
        if (m === from.month && m === to.month) {
            // Gleicher Monat: Differenz der Anteile
            weights[m] = POSITION_WEIGHT_END[to.position] - (1 - POSITION_WEIGHT_START[from.position]);
        } else if (m === from.month) {
            weights[m] = POSITION_WEIGHT_START[from.position];
        } else if (m === to.month) {
            weights[m] = POSITION_WEIGHT_END[to.position];
        } else {
            weights[m] = 1; // voller Monat
        }
    }

    return weights;
};
