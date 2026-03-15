import proj4 from "proj4";
import type {MonthValueType} from "../types/dataTypes";
import type {RasterLookup, RasterMeta} from "../types/raster";

const basename = import.meta.env.BASE_URL;

export const precipRasterUrl = (basename + "/data/precip_1991-2020_mar_oct").replace(/\/+/, "/");;
export const et0RasterUrl = (basename + "/data/et0_1991-2020_mar_oct").replace(/\/+/, "/");;


// Bekannte CRS-Definitionen – bei Bedarf erweiterbar
const CRS_DEFS: Record<string, string> = {
    "EPSG:31467":
        "+proj=tmerc +lat_0=0 +lon_0=9 +k=1 +x_0=3500000 +y_0=0 " +
        "+ellps=bessel +datum=potsdam +units=m +no_defs",
    "EPSG:25832":
        "+proj=utm +zone=32 +ellps=GRS80 +datum=ETRS89 +units=m +no_defs",
};

const ensureCrs = (crs: string): void => {
    if (proj4.defs(crs)) return;
    const def = CRS_DEFS[crs];
    if (!def) throw new Error(`Unknown CRS: ${crs} – add definition to CRS_DEFS`);
    proj4.defs(crs, def);
};

export const createRasterLookup = (url: string): Promise<RasterLookup> => {
    const binUrl = url + ".bin";
    const metaUrl = url + ".meta.json";
    let buffer: Uint16Array | null = null;
    let _meta: RasterMeta | null = null;

    const load = (): Promise<void> => {
        if (buffer) return Promise.resolve();

        return Promise.all([
            fetch(binUrl).then((r) => {
                if (!r.ok) throw new Error(`Failed to fetch ${binUrl}: ${r.status}`);
                return r.arrayBuffer();
            }),
            fetch(metaUrl).then((r) => {
                if (!r.ok) throw new Error(`Failed to fetch ${metaUrl}: ${r.status}`);
                return r.json() as Promise<RasterMeta>;
            }),
        ]).then(([buf, meta]) => {
            ensureCrs(meta.crs);
            buffer = new Uint16Array(buf);
            _meta = meta;
        });
    };

    const _toPixel = (
        lon: number, lat: number
    ): {col: number; row: number;} | null => {
        if (!_meta) throw new Error("Raster not loaded");
        const [px, py] = proj4("EPSG:4326", _meta.crs, [lon, lat]) as [number, number];
        const col = Math.round((px - _meta.xcenter_ll) / _meta.cellsize);
        const row = _meta.nrows - 1 - Math.round((py - _meta.ycenter_ll) / _meta.cellsize);
        if (col < 0 || col >= _meta.ncols || row < 0 || row >= _meta.nrows) return null;
        return {col, row};
    };

    const getValue = (lon: number, lat: number, month: number): number | null => {
        if (!buffer || !_meta) throw new Error("Raster not loaded – call load() first");
        const monthIdx = _meta.months.indexOf(month);
        if (monthIdx === -1) return null;
        const px = _toPixel(lon, lat);
        if (!px) return null;
        const idx = monthIdx * _meta.nrows * _meta.ncols + px.row * _meta.ncols + px.col;
        const val = buffer[idx];
        return val === _meta.nodata ? null : val;
    };

    const getValues = (
        lon: number,
        lat: number,
    ): MonthValueType =>
        [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => getValue(lon, lat, month)) as MonthValueType;


    return load().then(() => ({getValue, getValues, meta: () => _meta}));
};
