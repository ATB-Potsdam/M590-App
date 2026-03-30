export const formatNum = (value: number, decimals: number): string =>
    value.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });

export const formatRange = ([min, max]: [number, number], unit: string): string =>
    min === max
        ? `${formatNum(min, 0)} ${unit}`
        : `${formatNum(min, 0)}–${formatNum(max, 0)} ${unit}`;
