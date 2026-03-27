import initWasm, * as poly from "../pkg/polylookup.js"; // static import so Vite bundles it

const basename = import.meta.env.BASE_URL;

const WASM_BIN = new URL("../pkg/polylookup_bg.wasm", import.meta.url);
const FGB_URL = (basename + "/data/Klimaraeume.fgb").replace(/\/+/, "/"); // put file in public/data/
const NFKWE_URL = (basename + "/data/nfkwe.fgb").replace(/\/+/, "/"); // put file in public/data/

let polylookupPromise: Promise<typeof poly> | undefined = undefined;

export const initPolylookup = () => {
    if (!polylookupPromise) {
        polylookupPromise = initWasm(WASM_BIN).then(() => poly);
    }
    return polylookupPromise;
};

const loadLayer = (url: string) =>
    initPolylookup().then(mod =>
        fetch(url).then(res => {
            if (!res.ok) return Promise.reject(new Error(`Failed to fetch ${url}: ${res.status}`));
            return res.arrayBuffer().then(buffer =>
                mod.WasmLayer.loadLayerFromBytes(new Uint8Array(buffer))
            );
        })
    );

export const loadClimateLayerFromPublic = () => loadLayer(FGB_URL);
export const loadNfkweLayerFromPublic = () => loadLayer(NFKWE_URL);