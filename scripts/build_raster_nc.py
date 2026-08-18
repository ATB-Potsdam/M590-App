"""Build the M 590 climate rasters from the DWD products the Merkblatt names.

Kapitel 4.2.3 defines KWBv = Nv - ETpv over the 1991-2020 reference period and
names the two inputs explicitly: precipitation from HYRAS (Rauthe et al. 2013)
and grass reference evapotranspiration after FAO-56 (Allen et al. 1998). Neither
is published as a ready-made 30-year monthly mean, so this script aggregates them:

  et0_fao       grids_germany/daily/evaporation_fao/          daily, ~395 MB/year
  precip_hyras  grids_germany/monthly/hyras_de/precipitation/  monthly sums, one file

The two do NOT share a grid: FAO-56 is 654 x 866 on EPSG:31467 (the same grid the
old multi_annual products used), HYRAS is 665 x 890 on EPSG:3035 (ETRS89-LAEA).
That is fine -- the app reprojects each raster independently from meta["crs"] --
but it means EPSG:3035 had to be added to CRS_DEFS in rasterData.ts, and the grid
of each product is asserted below so a silent upstream change cannot slip through.

The daily FAO-56 download is ~12 GB for 1991-2020. Years are streamed one at a
time and deleted after use unless --keep-cache is given, so peak disk stays at
one year (~400 MB). Values are stored as uint16 in mm, matching build_raster.py:
the app reads the stored number directly and never applies meta["scale"].

Usage:
    python3 scripts/build_raster_nc.py --type et0_fao --months 3-10
    python3 scripts/build_raster_nc.py --type precip_hyras --months 1-12
"""

import argparse
import json
import urllib.request
from pathlib import Path

import netCDF4 as nc
import numpy as np

# ── Configuration ────────────────────────────────────────────────────────────

BASE_URL = "https://opendata.dwd.de/climate_environment/CDC/"

RASTER_CONFIGS = {
    "et0_fao": {
        "url_path": "grids_germany/daily/evaporation_fao/",
        # v1.1 is the current revision; v1 exists for some years but is superseded.
        "filename_tpl": "grids_germany_daily_evaporation_fao_{year}_v1.1.nc",
        "per_year": True,
        "var": "eta_fao",
        "out_stem_tpl": "et0fao_{period}_{span}",
        "unit": "mm",
        "description": "Grasreferenzverdunstung nach FAO-56 (ET₀, 30-jähriges Mittel)",
        "source": "DWD CDC grids_germany/daily/evaporation_fao (Allen et al. 1998)",
        "shape": (866, 654),
        "crs": "EPSG:31467",
    },
    "precip_hyras": {
        "url_path": "grids_germany/monthly/hyras_de/precipitation/",
        # One file holds every year, already aggregated to monthly sums.
        "filename_tpl": "pr_hyras_1_1931_2024_v6-1_de_monsum.nc",
        "per_year": False,
        "var": "pr",
        "out_stem_tpl": "preciphyras_{period}_{span}",
        "unit": "mm",
        "description": "Niederschlagshöhe HYRAS v6.1 (30-jähriges Mittel)",
        "source": "DWD CDC grids_germany/monthly/hyras_de/precipitation (Rauthe et al. 2013)",
        # HYRAS is published on ETRS89-LAEA, not the Gauss-Krüger grid the older
        # multi_annual products use. The app reprojects per raster from
        # meta["crs"], so the two need not agree — but the value must be right.
        "shape": (890, 665),
        "crs": "EPSG:3035",
    },
}

MONTH_ABBR = ["jan", "feb", "mar", "apr", "may", "jun",
              "jul", "aug", "sep", "oct", "nov", "dec"]


# ── Helpers ──────────────────────────────────────────────────────────────────

def download(url_path: str, filename: str, cache_dir: Path) -> Path:
    """Fetch a file into the cache, skipping the download if it is already there."""
    local = cache_dir / filename
    if local.exists():
        print(f"  ✓ {filename} (cache)")
        return local

    url = BASE_URL + url_path + filename
    tmp = local.with_suffix(local.suffix + ".part")
    print(f"  ↓ {filename}")
    urllib.request.urlretrieve(url, tmp)
    # Rename only on success, so an interrupted run cannot leave a truncated
    # file that the next run would happily treat as cached.
    tmp.rename(local)
    return local


def month_index(ds: nc.Dataset) -> np.ndarray:
    """Calendar month (1-12) for every time step of a dataset."""
    tvar = ds.variables["time"]
    dates = nc.num2date(
        tvar[:], tvar.units,
        calendar=getattr(tvar, "calendar", "standard"),
        only_use_cftime_datetimes=False,
        only_use_python_datetimes=True,
    )
    return np.array([d.month for d in dates])


def read_grid(ds: nc.Dataset, var: str) -> np.ma.MaskedArray:
    """Read a variable, letting netCDF4 apply scale_factor and the fill mask."""
    v = ds.variables[var]
    v.set_auto_maskandscale(True)
    return v[:]


def year_range(period: str) -> list[int]:
    start, end = (int(x) for x in period.split("-"))
    return list(range(start, end + 1))


def grid_geometry(ds: nc.Dataset) -> dict:
    """Cell-centre origin, size, and row order, from the coordinate axes."""
    x = np.asarray(ds.variables["x"][:], dtype=float)
    y = np.asarray(ds.variables["y"][:], dtype=float)

    # The app indexes rows from the north (row 0 = northernmost) and derives the
    # row from ycenter_ll, so the origin is the *southernmost* centre regardless
    # of the axis ordering in the file.
    return {
        "xcenter_ll": float(x.min()),
        "ycenter_ll": float(y.min()),
        "cellsize": float(abs(x[1] - x[0])),
        # y ascending means row 0 is the southernmost line, so the grid has to be
        # flipped before writing. Captured here so the caller need not reopen the
        # file (for et0_fao the year has already been deleted by then).
        "flip_rows": bool(y[0] < y[-1]),
    }


# ── Aggregation ──────────────────────────────────────────────────────────────

def accumulate_daily(
    cfg: dict, period: str, months: list[int], cache_dir: Path, keep_cache: bool
) -> tuple[np.ndarray, np.ndarray, dict]:
    """Sum daily values per month per year, and count the years contributing."""
    expected_shape: tuple[int, int] = cfg["shape"]
    totals: np.ndarray | None = None
    counts: np.ndarray | None = None
    geom: dict | None = None

    for year in year_range(period):
        filename = cfg["filename_tpl"].format(year=year)
        path = download(cfg["url_path"], filename, cache_dir)

        with nc.Dataset(path) as ds:
            var_shape = ds.variables[cfg["var"]].shape[1:]
            if var_shape != expected_shape:
                raise SystemExit(
                    f"Unexpected grid {var_shape}, expected {expected_shape}"
                )
            if totals is None or counts is None:
                geom = grid_geometry(ds)
                totals = np.zeros((len(months),) + expected_shape, dtype=np.float64)
                counts = np.zeros(len(months), dtype=np.int32)

            mon = month_index(ds)
            data = read_grid(ds, cfg["var"])

            for i, m in enumerate(months):
                sel = np.flatnonzero(mon == m)
                if sel.size == 0:
                    continue
                # Missing cells (sea, outside Germany) stay masked; filling with
                # 0 here would drag the 30-year mean down at the coast.
                monthly_sum = data[sel].sum(axis=0)
                totals[i] += np.ma.filled(monthly_sum, 0.0)
                counts[i] += 1

            print(f"  {year}: months {sorted(set(mon[np.isin(mon, months)]))}")

        if not keep_cache:
            path.unlink()

    assert totals is not None and counts is not None and geom is not None
    return totals, counts, geom


def accumulate_monthly(
    cfg: dict, period: str, months: list[int], cache_dir: Path
) -> tuple[np.ndarray, np.ndarray, dict]:
    """Average pre-aggregated monthly sums over the reference period."""
    expected_shape: tuple[int, int] = cfg["shape"]
    path = download(cfg["url_path"], cfg["filename_tpl"], cache_dir)
    years = set(year_range(period))

    with nc.Dataset(path) as ds:
        geom = grid_geometry(ds)
        data = read_grid(ds, cfg["var"])
        if data.shape[1:] != expected_shape:
            raise SystemExit(
                f"Unexpected grid {data.shape[1:]}, expected {expected_shape}"
            )

        tvar = ds.variables["time"]
        dates = nc.num2date(
            tvar[:], tvar.units,
            calendar=getattr(tvar, "calendar", "standard"),
            only_use_cftime_datetimes=False,
            only_use_python_datetimes=True,
        )
        mon = np.array([d.month for d in dates])
        yr = np.array([d.year for d in dates])

        totals = np.zeros((len(months),) + expected_shape, dtype=np.float64)
        counts = np.zeros(len(months), dtype=np.int32)

        for i, m in enumerate(months):
            sel = np.flatnonzero((mon == m) & np.isin(yr, list(years)))
            if sel.size == 0:
                raise SystemExit(f"No data for month {m} in period {period}")
            totals[i] = np.ma.filled(data[sel].sum(axis=0), 0.0)
            counts[i] = sel.size
            print(f"  month {m:02d}: {sel.size} years")

    return totals, counts, geom


# ── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="DWD NetCDF (FAO-56 / HYRAS) → compact uint16 binary"
    )
    parser.add_argument("--type", required=True, choices=RASTER_CONFIGS.keys())
    parser.add_argument("--period", default="1991-2020")
    parser.add_argument("--months", default="3-10", help="e.g. '3-10' or '1-12'")
    parser.add_argument("--out-dir", default=None)
    parser.add_argument("--cache-dir", default=None,
                        help="where downloads land (default: scripts/.cache/<type>); "
                             "put this on a roomy disk for et0_fao")
    parser.add_argument("--keep-cache", action="store_true",
                        help="keep the daily files instead of deleting each year "
                             "after use (~12 GB for et0_fao)")
    args = parser.parse_args()

    m_start, m_end = (int(x) for x in args.months.split("-"))
    months = list(range(m_start, m_end + 1))
    cfg = RASTER_CONFIGS[args.type]

    out_dir = Path(args.out_dir) if args.out_dir else (
        Path(__file__).parent.parent / "app" / "public" / "data"
    )
    cache_dir = (Path(args.cache_dir) if args.cache_dir else
                 Path(__file__).parent / ".cache" / args.type)
    out_dir.mkdir(parents=True, exist_ok=True)
    cache_dir.mkdir(parents=True, exist_ok=True)

    span = ("full_year" if months == list(range(1, 13))
            else f"{MONTH_ABBR[m_start - 1]}_{MONTH_ABBR[m_end - 1]}")
    out_stem = cfg["out_stem_tpl"].format(period=args.period, span=span)
    bin_path = out_dir / f"{out_stem}.bin"
    meta_path = out_dir / f"{out_stem}.meta.json"

    print(f"\nBuilding {args.type} | period={args.period} | months={months}")
    print(f"Cache  → {cache_dir}")
    print(f"Output → {out_dir}\n")

    if cfg["per_year"]:
        totals, counts, geom = accumulate_daily(
            cfg, args.period, months, cache_dir, args.keep_cache
        )
    else:
        totals, counts, geom = accumulate_monthly(
            cfg, args.period, months, cache_dir
        )

    # 30-year mean of the monthly sums, then to uint16 mm like build_raster.py.
    mean = totals / counts[:, None, None]
    mean = np.nan_to_num(mean, nan=0.0, posinf=0.0, neginf=0.0)
    mean[mean < 0] = 0

    if geom["flip_rows"]:
        mean = mean[:, ::-1, :]

    stacked = np.rint(mean).astype(np.uint16)
    stacked.tofile(bin_path)

    meta = {
        "type": cfg["out_stem_tpl"].split("_")[0],
        "description": cfg["description"],
        "source": cfg["source"],
        "unit": cfg["unit"],
        "scale": 1.0,
        "period": args.period,
        "months": months,
        "nrows": cfg["shape"][0],
        "ncols": cfg["shape"][1],
        "xcenter_ll": geom["xcenter_ll"],
        "ycenter_ll": geom["ycenter_ll"],
        "cellsize": geom["cellsize"],
        "crs": cfg["crs"],
        "nodata": 0,
        "dtype": "uint16",
        "layout": "C",
    }
    meta_path.write_text(json.dumps(meta, indent=2))

    for i, m in enumerate(months):
        valid = stacked[i][stacked[i] > 0]
        if valid.size:
            print(f"  month {m:02d}: min={valid.min()} max={valid.max()} "
                  f"mean={valid.mean():.1f} {cfg['unit']}")

    size_mb = bin_path.stat().st_size / 1024 / 1024
    print(f"\n✓ {bin_path.name}  ({size_mb:.1f} MB)  shape={stacked.shape}")
    print(f"✓ {meta_path.name}")


if __name__ == "__main__":
    main()
