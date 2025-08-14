import initWasm, * as poly from "../pkg/polylookup.js"; // <-- static import
const WASM_BIN = new URL("../pkg/polylookup_bg.wasm", import.meta.url);
const FGB_URL = "/data/Klimaraeume.fgb"; // keep in public/data/

let ready = false;

export async function initPolylookup() {
    if (!ready) {
        await initWasm(WASM_BIN); // explicit wasm URL works in Capacitor
        ready = true;
    }
    return poly; // exports include WasmLayer
}

export async function loadLayerFromPublic() {
    const mod = await initPolylookup();
    const res = await fetch(FGB_URL);
    if (!res.ok) throw new Error(`Failed to fetch ${FGB_URL}: ${res.status}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    return mod.WasmLayer.loadLayerFromBytes(bytes);
}
