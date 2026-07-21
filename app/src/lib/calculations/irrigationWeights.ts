import type {IrrigationPeriod} from "../../types/project";

// Weighting: what fraction of a month a bound covers
const POSITION_WEIGHT_START: Record<string, number> = {
    early: 0.75,  // start = from ~1/4 of the month → 3/4 remain
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

// Returns for each calendar month (1–12) the fraction that lies within the period
export const getMonthWeights = (period: IrrigationPeriod): Partial<Record<number, number>> => {
    const {from, to} = period;
    const weights: Partial<Record<number, number>> = {};

    for (let m = from.month; m <= to.month; m++) {
        if (m === from.month && m === to.month) {
            // Same month: difference of the fractions
            weights[m] = POSITION_WEIGHT_END[to.position] - (1 - POSITION_WEIGHT_START[from.position]);
        } else if (m === from.month) {
            weights[m] = POSITION_WEIGHT_START[from.position];
        } else if (m === to.month) {
            weights[m] = POSITION_WEIGHT_END[to.position];
        } else {
            weights[m] = 1; // full month
        }
    }

    return weights;
};
