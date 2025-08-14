import { useAppStore } from "../stores/useAppStore";
import type { ClimateClassType } from "../types";

type Match = { id: number; kwb: number | null };

export const latLonToClimateClass = ({
    lat,
    lon,
}: {
    lat: number;
    lon: number;
}): Promise<ClimateClassType> => {
    const layer = useAppStore.getState().layer;
    if (!layer) {
        return Promise.reject("No layer loaded");
    }
    const json = layer.queryPointJSON(lon, lat); // WASM expects (lon, lat)
    const result: Match[] = JSON.parse(json);
    const kwb = result[0]?.kwb;

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
