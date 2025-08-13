// Include WASM bindings only when building for wasm32
#[cfg(target_arch = "wasm32")]
mod wasm;
#[cfg(target_arch = "wasm32")]
pub use wasm::*;

// Everything below is the native (non-wasm) implementation
#[cfg(not(target_arch = "wasm32"))]
mod native {
    use flatgeobuf::{FallibleStreamingIterator, FeatureProperties, FgbReader};
    use geo::{Contains, Point};
    use geo_traits::to_geo::ToGeoGeometry;
    use geo_types::Geometry;
    use memmap2::Mmap;
    use once_cell::sync::Lazy;
    use serde::Serialize;
    use std::ffi::{CStr, CString};
    use std::fs::File;
    use std::io::{Cursor, Seek, SeekFrom};
    use std::os::raw::c_char;
    use std::path::Path;
    use std::sync::RwLock;

    #[derive(Serialize)]
    struct Match {
        id: u64,
        kwb: Option<i64>,
    }

    struct Layer {
        mmap: Mmap,
    }

    impl Layer {
        fn open(path: &str) -> Result<Self, String> {
            let file = File::open(Path::new(path)).map_err(|e| e.to_string())?;
            let mmap = unsafe { Mmap::map(&file).map_err(|e| e.to_string())? };
            Ok(Self { mmap })
        }

        fn query(&self, lon: f64, lat: f64) -> Result<Vec<Match>, String> {
            let eps = 1e-9;
            let (minx, miny, maxx, maxy) = (lon - eps, lat - eps, lon + eps, lat + eps);

            let mut rdr = Cursor::new(&self.mmap[..]);
            rdr.seek(SeekFrom::Start(0)).map_err(|e| e.to_string())?;
            let fgb = FgbReader::open(&mut rdr).map_err(|e| e.to_string())?;
            let mut iter = fgb
                .select_bbox(minx, miny, maxx, maxy)
                .map_err(|e| e.to_string())?;

            let pt = Point::new(lon, lat);
            let mut out = Vec::new();
            let mut idx = 0u64;

            while let Some(feat) = iter.next().map_err(|e| e.to_string())? {
                // Try numeric KWB first; fall back to parsing string
                let kwb = feat.properties().ok().and_then(|p| {
                    p.get("KWB")
                        .and_then(|v| v.as_str().to_string().trim().parse::<i64>().ok())
                });

                if let Some(gt) = feat.geometry_trait().map_err(|e| e.to_string())? {
                    let g: Geometry<f64> = gt.to_geometry();
                    if g.contains(&pt) {
                        out.push(Match { id: idx, kwb });
                    }
                }
                idx += 1;
            }
            Ok(out)
        }
    }

    // thread-safe global
    static LAYER: Lazy<RwLock<Option<Layer>>> = Lazy::new(|| RwLock::new(None));

    #[no_mangle]
    pub extern "C" fn load_layer(path_ptr: *const c_char) -> i32 {
        if path_ptr.is_null() {
            return 1;
        }
        let cstr = unsafe { CStr::from_ptr(path_ptr) };
        let path = match cstr.to_str() {
            Ok(p) => p,
            Err(_) => return 1,
        };
        match Layer::open(path) {
            Ok(layer) => {
                *LAYER.write().unwrap() = Some(layer);
                0
            }
            Err(_) => 1,
        }
    }

    #[no_mangle]
    pub extern "C" fn query_point_json(lon: f64, lat: f64) -> *mut c_char {
        let json = (|| -> Result<String, ()> {
            let guard = LAYER.read().map_err(|_| ())?;
            let layer = guard.as_ref().ok_or(())?;
            let m = layer.query(lon, lat).map_err(|_| ())?;
            Ok(serde_json::to_string(&m).unwrap_or_else(|_| "[]".into()))
        })()
        .unwrap_or_else(|_| "[]".into());
        CString::new(json).unwrap().into_raw()
    }

    #[no_mangle]
    pub extern "C" fn free_cstring(ptr: *mut c_char) {
        if ptr.is_null() {
            return;
        }
        unsafe {
            let _ = CString::from_raw(ptr);
        }
    }
}
