import type {MonthValueType} from "../../types/dataTypes";

/**
 * Annual precipitation (mm/a) from the monthly raster values.
 *
 * Only meaningful if the underlying raster actually covers all twelve months.
 * It did not until the precipitation raster was rebuilt as `full_year`: months
 * outside March–October were null, so this sum silently returned an eight-month
 * total and pushed sites into too low a precipitation class — which raises the
 * calculated demand for weinbau, naturrasen, golf and tennen.
 *
 * Returns null if any month is missing, so callers can treat the data as
 * incomplete instead of quietly under-counting.
 */
export const annualPrecipitationMm = (precipitation: MonthValueType): number | null => {
    let sum = 0;
    for (const v of precipitation) {
        if (v === null || v === undefined) return null;
        sum += v;
    }
    return sum;
};
