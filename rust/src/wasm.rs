use flatgeobuf::{FallibleStreamingIterator, FeatureProperties, FgbReader};
use geo::{Covers, Point}; // use Covers for nicer boundary handling
use geo_traits::to_geo::ToGeoGeometry;
use geo_types::Geometry;
use serde::Serialize;
use std::io::{Cursor, Seek, SeekFrom};
use wasm_bindgen::prelude::*;

#[derive(Serialize)]
struct Match {
    id: u64,
    // adjust the field name/type to what you want to return
    kwb: Option<i64>,
}

#[wasm_bindgen]
pub struct WasmLayer {
    bytes: Vec<u8>,
}

#[wasm_bindgen]
impl WasmLayer {
    /// Load FlatGeobuf bytes (e.g., fetched as ArrayBuffer in JS)
    #[wasm_bindgen(js_name = loadLayerFromBytes)]
    pub fn load_from_bytes(bytes: &[u8]) -> Result<WasmLayer, JsValue> {
        Ok(WasmLayer {
            bytes: bytes.to_vec(),
        })
    }

    /// Query point; returns JSON like: `[{"id":0,"kwb":123}, ...]`
    #[wasm_bindgen(js_name = queryPointJSON)]
    pub fn query_point_json(&self, lon: f64, lat: f64) -> Result<String, JsValue> {
        // tiny epsilon to avoid degenerate bbox oddities
        let eps = 1e-9;
        let (minx, miny, maxx, maxy) = (lon - eps, lat - eps, lon + eps, lat + eps);

        let mut rdr = Cursor::new(&self.bytes);
        rdr.seek(SeekFrom::Start(0)).map_err(to_js)?;
        let fgb = FgbReader::open(&mut rdr).map_err(to_js)?;
        let mut iter = fgb.select_bbox(minx, miny, maxx, maxy).map_err(to_js)?;

        let pt = Point::new(lon, lat);
        let mut out: Vec<Match> = Vec::new();
        let mut idx = 0u64;

        while let Some(feat) = iter.next().map_err(to_js)? {
            // Example: read an i64 property "KWB"; fall back to parse string if needed
            let kwb: Option<i64> = feat.property::<i64>("KWB").ok().flatten().or_else(|| {
                feat.properties()
                    .ok()
                    .and_then(|p| p.get("KWB"))
                    .and_then(|s| s.trim().parse::<i64>().ok())
            });

            if let Some(gt) = feat.geometry_trait().map_err(to_js)? {
                let g: Geometry<f64> = gt.to_geometry();
                if g.covers(&pt) {
                    out.push(Match { id: idx, kwb });
                }
            }
            idx += 1;
        }

        Ok(serde_json::to_string(&out).unwrap_or_else(|_| "[]".into()))
    }
}

fn to_js<E: ToString>(e: E) -> JsValue {
    JsValue::from_str(&e.to_string())
}
