# polylookup — Build & Integration Guide

This guide shows how to build the **polylookup** Rust core (FlatGeobuf + fast point‑in‑polygon) for Linux, Android, and WebAssembly. It also includes quick smoke tests and notes for iOS builds.

> **What it is**  
> A tiny cross‑platform core that memory‑maps a `.fgb` file, uses FlatGeobuf’s packed **R‑tree** to select bbox candidates, and then runs exact **point‑in‑polygon** checks with the `geo` crate. Exposes a simple C ABI so you can call it from Swift/Kotlin/C/JS bindings.

---

## 0) Project layout (expected)

```
polylookup/
  Cargo.toml
  src/
    lib.rs
  data/
    layer.fgb      # your FlatGeobuf layer(s)
```

> The `lib.rs` should contain the fast version that uses `select_bbox` and returns JSON via `query_point_json`. (From the previous message.)

---

## 1) Prerequisites

- **Rust toolchain** (stable):  
  ```bash
  curl https://sh.rustup.rs -sSf | sh
  source $HOME/.cargo/env
  ```
- **Clang/cc** on Linux for linking C test code
- For **Android**: Android SDK + **NDK**; `cargo-ndk`
- For **WebAssembly**: `wasm32-unknown-unknown` target; optional `wasm-pack` for ergonomic JS bindings

---

## 2) Build on Linux (.so)

```bash
# From the project root
cargo build --release
# Output:
# target/release/libpolylookup.so
```

**Exports (C ABI):**
```c
int   load_layer(const char* path);            // 0 success, 1 failure
char* query_point_json(double lon, double lat);// returns malloc'd JSON string
void  free_cstring(char* ptr);                 // free the returned string
```

### Quick smoke test (C)

```bash
cat > test.c << 'EOF'
#include <stdio.h>

extern int load_layer(const char* path);
extern char* query_point_json(double lon, double lat);
extern void free_cstring(char* ptr);

int main() {
    if (load_layer("data/layer.fgb") != 0) { puts("load failed"); return 1; }
    char* s = query_point_json(7.0, 50.0);
    printf("matches: %s\n", s);
    free_cstring(s);
    return 0;
}
EOF

cc test.c -L target/release -lpolylookup -Wl,-rpath=target/release -o test
./test
```

---

## 3) Android builds (.so per ABI)

### 3.1 Install tooling

```bash
# Ensure you have Android SDK + NDK installed.
# Example for environment variable:
export ANDROID_NDK_HOME="$HOME/Android/Sdk/ndk/27.0.12077973"

# Install helper and targets
cargo install cargo-ndk
rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android
```

### 3.2 Build libraries

```bash
# arm64-v8a
cargo ndk -t arm64-v8a -o ./android-libs build --release
# armeabi-v7a
cargo ndk -t armeabi-v7a -o ./android-libs build --release
# x86_64 (emulators)
cargo ndk -t x86_64 -o ./android-libs build --release
```

**Outputs:**
```
android-libs/arm64-v8a/libpolylookup.so
android-libs/armeabi-v7a/libpolylookup.so
android-libs/x86_64/libpolylookup.so
```

### 3.3 Kotlin/JNI notes

Wrap the C exports in a small JNI layer that:
- Converts `jstring`/UTF‑8
- Calls `load_layer`/`query_point_json`
- Frees the C string and returns a Java `String`

Example JNI signature you might expose to Kotlin:
```kotlin
external fun loadLayer(path: String): Int
external fun queryPointJson(lon: Double, lat: Double): String
```

Load the lib:
```kotlin
System.loadLibrary("polylookup")
```

---

## 4) WebAssembly builds

Two approaches — pick one.

### 4.A Minimal (no extra deps)

```bash
rustup target add wasm32-unknown-unknown
cargo build --release --target wasm32-unknown-unknown
# Output: target/wasm32-unknown-unknown/release/polylookup.wasm
```

You’ll need a small JS loader to:
- Instantiate the `.wasm`
- Pass bytes of your `.fgb` to a variant like `load_layer_from_bytes` (recommended to add)
- Call a function that returns JSON (e.g., `query_point_json` equivalent)

> Tip: For web, it’s more ergonomic to expose APIs with `wasm-bindgen` (see next route).

### 4.B Ergonomic JS via `wasm-bindgen` / `wasm-pack`

Add dependency:
```toml
[dependencies]
wasm-bindgen = "0.2"
```

Create a wasm wrapper (e.g., `src/wasm.rs`) that exposes:
```rust
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct WasmLayer { inner: crate::Layer }

#[wasm_bindgen]
impl WasmLayer {
    #[wasm_bindgen(js_name = loadLayerFromBytes)]
    pub fn load_from_bytes(bytes: &[u8]) -> Result<WasmLayer, JsValue> {
        let mmap = memmap2::MmapOptions::new().map_copy_read_only(bytes)
            .map_err(|e| JsValue::from_str(&e.to_string()))?;
        Ok(WasmLayer { inner: crate::Layer { mmap } })
    }

    #[wasm_bindgen(js_name = queryPointJSON)]
    pub fn query_point_json(&self, lon: f64, lat: f64) -> Result<String, JsValue> {
        let m = self.inner.query(lon, lat).map_err(|e| JsValue::from_str(&e))?;
        Ok(serde_json::to_string(&m).unwrap())
    }
}
```

Build:
```bash
cargo install wasm-pack
wasm-pack build --release --target web
# Output: pkg/ (ESM + .wasm)
```

Use in your app:
```js
import init, { WasmLayer } from "./pkg/polylookup.js";

await init();
const bytes = await (await fetch("/data/layer.fgb")).arrayBuffer();
const layer = WasmLayer.loadLayerFromBytes(new Uint8Array(bytes));
const json = layer.queryPointJSON(7.123, 50.987);
```

---

## 5) iOS (note)

iOS builds require **macOS + Xcode SDKs**. From macOS:

```bash
rustup target add aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios
cargo build --release --target aarch64-apple-ios
```

You can package as a `.framework` or use Swift Package Manager with a C module map. From Linux you cannot realistically build iOS binaries.

---

## 6) Data & performance tips

- Keep your `.fgb` in **EPSG:4326** unless you have a reason not to.
- Store a **stable ID** (e.g., `code`) in attributes; return that instead of ephemeral indices.
- For multi‑layer apps, expose a handle‑based API:
  - `load_layer_with_id(path) -> u32`
  - `query_point_json_with_id(id, lon, lat)`
- Define **boundary semantics** once (e.g., boundary = inside) and keep it consistent across platforms.
- If the dataset is huge, split by **region** and lazy‑load on demand.

---

## 7) Troubleshooting

- **“Mismatched geometry type” during export**: ensure polygons are **MultiPolygon** or use `-explodecollections`. Example:
  ```bash
  ogr2ogr -f FlatGeobuf out.fgb in.shp -nlt PROMOTE_TO_MULTI -nlt CONVERT_TO_LINEAR -makevalid
  ```
- **No matches near edges**: check CRS, or precision; consider using a tiny tolerance or snapping logic.
- **Android crashes on load**: verify `System.loadLibrary("polylookup")`, ABI matches, and `.fgb` is present and readable.

---

## 8) License & notes

This guide is a companion to the “fast runtime engine” example. Adjust paths and names as needed for your project structure.
