import {allOtherPlants} from "../constants/soilConstants";
import {useAppStore} from "../stores/useAppStore";
import type {ClimateClassType} from "../types";
import type {AnyPlantName, MonthValueType, NFkweClassName, Range, YearType} from "../types/dataTypes";

type Match = {id: number; value: number | null;};

export const latLonToClimateClass = ({
    lat,
    lon,
}: {
    lat: number;
    lon: number;
}): Promise<ClimateClassType> => {
    const layer = useAppStore.getState().climateLayer;
    if (!layer) {
        return Promise.reject("No layer loaded");
    }
    const json = layer.queryPointJSON(lon, lat, "KWB"); // WASM expects (lon, lat)
    const result: Match[] = JSON.parse(json);
    const kwb = result[0]?.value;

    if (kwb === null || kwb === undefined) {
        return Promise.reject("Unknown location");
    }

    if (kwb > 50) {
        return Promise.resolve(["A", kwb]);
    }
    if (kwb > 0) {
        return Promise.resolve(["B", kwb]);
    }
    if (kwb > -50) {
        return Promise.resolve(["C", kwb]);
    }
    if (kwb > -100) {
        return Promise.resolve(["D", kwb]);
    }
    if (kwb > -150) {
        return Promise.resolve(["E", kwb]);
    }
    if (kwb > -200) {
        return Promise.resolve(["F", kwb]);
    }
    if (kwb > -250) {
        return Promise.resolve(["G", kwb]);
    }
    return Promise.resolve(["H", kwb]);
};


export const latLonToNfkweClass = ({
    lat,
    lon,
}: {
    lat: number;
    lon: number;
}): Promise<NFkweClassName | null> => {
    const nfkweLayer = useAppStore.getState().nfkweLayer;
    if (!nfkweLayer) return Promise.reject("No nfkwe layer loaded");

    const json = nfkweLayer.queryPointJSON(lon, lat, "nfkww_st_DWA");
    const result: Array<Record<string, unknown>> = JSON.parse(json);
    const val = result[0]?.value;

    switch (String(val)) {
        case '1':
        case '2': return Promise.resolve("1-2");
        case '3a':
        case '3b':
        case '4':
        case '5': return Promise.resolve(val as NFkweClassName);
    }
    return Promise.resolve(null);
};


const nFkwClassIndex: Record<NFkweClassName, number> = {
    "1-2": 0,
    "3a": 1,
    "3b": 2,
    "4": 3,
    "5": 4,
};

export const lookupOtherPlant = (name: AnyPlantName, yearType: YearType, nFkwClass: NFkweClassName) =>
    allOtherPlants[name][yearType === "normal" ? 0 : 1][nFkwClassIndex[nFkwClass]];

export const getKwbSum = (kwb: MonthValueType, time: Range): number => {
    const fromTimeIndex = Math.trunc(time[0] - 1);
    const fromTimeFactor = 1 - (time[0] % 1);
    const toTimeIndex = Math.trunc(time[1] - 1);
    const toTimeFactor = time[1] % 1 | 1;
    if (fromTimeIndex === toTimeIndex) {
        const factor = fromTimeFactor - (1 - toTimeFactor);
        return (kwb[fromTimeIndex] || 0) * factor;
    }
    return (
        (kwb[fromTimeIndex] || 0) * fromTimeFactor
        + (kwb[toTimeIndex] || 0) * toTimeFactor
        + kwb.slice(fromTimeIndex + 1, toTimeIndex)
            .reduce((sum: number, k) => sum + (k || 0), 0)
    );

};
