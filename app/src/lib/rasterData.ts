import proj4 from "proj4";
import type {MonthValueType} from "../types/dataTypes";
import type {RasterLookup, RasterMeta} from "../types/raster";

const basename = import.meta.env.BASE_URL;

// Both rasters are the products Kapitel 4.1.3 names for the KWB: HYRAS for
// precipitation and FAO-56 grass reference ET₀ for evaporation. The earlier
// `precip_*`/`et0_*` files came from multi_annual/precipitation and
// multi_annual/evapo_p — the latter is AMBAV/Haude, a different evaporation
// model — which put the ΔKWB correction on the wrong basis (see
// scripts/build_raster_nc.py).
//
// Precipitation covers the full year: the sport/green modules need a genuine annual
// sum for their precipitation class. ET₀ stays March–October — it is only used for the
// monthly KWB correction over a crop's irrigation period, never summed annually.
export const precipRasterUrl = (basename + "/data/preciphyras_1991-2020_full_year").replace(/\/+/, "/");;
export const et0RasterUrl = (basename + "/data/et0fao_1991-2020_mar_oct").replace(/\/+/, "/");;


// Bekannte CRS-Definitionen – bei Bedarf erweiterbar
const CRS_DEFS: Record<string, string> = {
    "EPSG:31467":
        "+proj=tmerc +lat_0=0 +lon_0=9 +k=1 +x_0=3500000 +y_0=0 " +
        "+ellps=bessel +datum=potsdam +units=m +no_defs",
    "EPSG:25832":
        "+proj=utm +zone=32 +ellps=GRS80 +datum=ETRS89 +units=m +no_defs",
    // HYRAS ships on the ETRS89-LAEA grid, not Gauss-Krüger like the older
    // multi_annual products — so the two rasters no longer share a projection.
    "EPSG:3035":
        "+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 " +
        "+ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
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

        // `r.ok` alone is not enough: a stale service worker answers an unknown
        // path with the SPA navigation fallback, i.e. HTTP 200 and index.html.
        // Parsing that as JSON produced "Unexpected token '<'", which reads like
        // a corrupt file rather than "this raster is gone". Check the payload is
        // really what we asked for and report it in terms the user can act on.
        const staleSwHint = "Bitte die Seite neu laden (Strg+F5).";
        const assertNotHtml = (r: Response, what: string): void => {
            if ((r.headers.get("content-type") ?? "").includes("text/html")) {
                throw new Error(`${what} wurde nicht gefunden. ${staleSwHint}`);
            }
        };

        return Promise.all([
            fetch(binUrl).then((r) => {
                if (!r.ok) throw new Error(`Failed to fetch ${binUrl}: ${r.status}`);
                assertNotHtml(r, "Klimadaten (Raster)");
                return r.arrayBuffer();
            }),
            fetch(metaUrl).then((r) => {
                if (!r.ok) throw new Error(`Failed to fetch ${metaUrl}: ${r.status}`);
                assertNotHtml(r, "Klimadaten (Metadaten)");
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
