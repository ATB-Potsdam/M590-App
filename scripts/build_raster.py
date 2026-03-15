import argparse
import gzip
import json
import urllib.request
from pathlib import Path

import numpy as np

# ── Konfiguration ────────────────────────────────────────────────────────────

RASTER_CONFIGS = {
    "precip": {
        "url_path": "grids_germany/multi_annual/precipitation/",
        "filename_tpl": "grids_germany_multi_annual_precipitation_{period}_{month:02d}.asc",
        "out_stem_tpl": "precip_{period}_mar_oct",
        "scale": 1.0,
        "unit": "mm",
        "description": "Niederschlagshöhe (30-jähriges Mittel)",
    },
    "et0": {
        "url_path": "grids_germany/multi_annual/evapo_p/",
        "filename_tpl": "grids_germany_multi_annual_evapo_p_{period}_{month:02d}.asc",
        "out_stem_tpl": "et0_{period}_mar_oct",
        "scale": 0.1,
        "unit": "mm",
        "description": "Potentielle Evapotranspiration Gras Penman-Monteith (ET₀)",
    },
}

BASE_URL = "https://opendata.dwd.de/climate_environment/CDC/"
NODATA   = -999

# ── Hilfsfunktionen ──────────────────────────────────────────────────────────

def download_asc(url_path: str, filename: str, cache_dir: Path) -> Path:
    gz_name   = filename + ".gz"
    local_gz  = cache_dir / gz_name
    local_asc = cache_dir / filename

    if not local_asc.exists():
        if not local_gz.exists():
            url = BASE_URL + url_path + gz_name
            print(f"  ↓ {gz_name}")
            urllib.request.urlretrieve(url, local_gz)
        print(f"  ✂ {gz_name}")
        with gzip.open(local_gz, "rb") as f_in, open(local_asc, "wb") as f_out:
            f_out.write(f_in.read())
    else:
        print(f"  ✓ {filename} (cache)")

    return local_asc


def parse_header(path: Path) -> dict:
    header = {}
    with open(path) as f:
        for _ in range(6):
            key, val = f.readline().split()
            header[key.lower()] = float(val)
    return header


def load_grid(path: Path, nrows: int, ncols: int) -> np.ndarray:
    data = np.loadtxt(path, skiprows=6, dtype=np.float32)
    assert data.shape == (nrows, ncols), f"Unexpected shape {data.shape} in {path.name}"
    return data


def build_meta(raw: dict, period: str, months: list[int], cfg: dict) -> dict:
    nrows    = int(raw["nrows"])
    ncols    = int(raw["ncols"])
    cellsize = raw["cellsize"]

    # CORNER → Zellmittelpunkt
    xll = raw.get("xllcorner", raw.get("xllcenter"))
    yll = raw.get("yllcorner", raw.get("yllcenter"))
    if "xllcorner" in raw:
        xll += cellsize / 2
        yll += cellsize / 2

    return {
        "type":        cfg["out_stem_tpl"].split("_")[0],   # "precip" | "et0"
        "description": cfg["description"],
        "unit":        cfg["unit"],
        "scale":       cfg.get("scale", 1.0),
        "period":      period,
        "months":      months,
        "nrows":       nrows,
        "ncols":       ncols,
        "xcenter_ll":  xll,
        "ycenter_ll":  yll,
        "cellsize":    cellsize,
        "crs":         "EPSG:31467",
        "nodata":      0,
        "dtype":       "uint16",
        "layout":      "C",   # [month_index, row, col], row 0 = Nord
    }

# ── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="DWD Raster → kompaktes Binary")
    parser.add_argument("--type",    required=True, choices=RASTER_CONFIGS.keys())
    parser.add_argument("--period",  default="1991-2020")
    parser.add_argument("--months",  default="3-10",
                        help="Monatsbereich, z.B. '3-10' oder '1-12'")
    parser.add_argument("--out-dir", default=None,
                        help="Ausgabeverzeichnis (default: app/public/data/)")
    args = parser.parse_args()

    m_start, m_end = (int(x) for x in args.months.split("-"))
    month_list = list(range(m_start, m_end + 1))
    cfg = RASTER_CONFIGS[args.type]

    out_dir   = Path(args.out_dir) if args.out_dir else (
        Path(__file__).parent.parent / "app" / "public" / "data"
    )
    cache_dir = Path(__file__).parent / ".cache" / args.type
    out_dir.mkdir(parents=True, exist_ok=True)
    cache_dir.mkdir(parents=True, exist_ok=True)

    out_stem = cfg["out_stem_tpl"].format(period=args.period)
    bin_path  = out_dir / f"{out_stem}.bin"
    meta_path = out_dir / f"{out_stem}.meta.json"

    print(f"\nBuilding {args.type} | period={args.period} | months={month_list}")
    print(f"Output → {out_dir}\n")

    grids: list[np.ndarray] = []
    meta: dict | None = None

    scale = cfg.get("scale", 1.0)

    for m in month_list:
        print(f"Month {m:02d}:")
        filename = cfg["filename_tpl"].format(period=args.period, month=m)
        asc_path = download_asc(cfg["url_path"], filename, cache_dir)

        raw_header = parse_header(asc_path)
        if meta is None:
            meta = build_meta(raw_header, args.period, month_list, cfg)
            nrows, ncols = meta["nrows"], meta["ncols"]

        grid = load_grid(asc_path, nrows, ncols)
        grid[grid == NODATA] = 0
        valid = grid[grid > 0]
        if valid.size:
            print(f"           min={valid.min():.1f}  max={valid.max():.1f}  {cfg['unit']}")

        if scale != 1.0:
            grid = np.where(grid > 0, grid * scale, grid)
        grids.append(grid.astype(np.uint16))

    stacked = np.stack(grids, axis=0)   # (n_months, nrows, ncols)
    stacked.tofile(bin_path)
    meta_path.write_text(json.dumps(meta, indent=2))

    size_mb = bin_path.stat().st_size / 1024 / 1024
    print(f"\n✓ {bin_path.name}  ({size_mb:.1f} MB)  shape={stacked.shape}")
    print(f"✓ {meta_path.name}")


if __name__ == "__main__":
    main()
