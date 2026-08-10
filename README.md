# DWA-App (M 590)

Irrigation water demand calculator for agricultural fields following
[DWA-M 590](https://www.dwa.de) (Deutsche Vereinigung für Wasserwirtschaft,
Abwasser und Abfall e.V.). Computes per-field water demand from climate data,
soil properties (nFKWe class), and crop or land-use type.

Live: https://dwa.runlevel3.de

## Repository layout

```
app/         React/TypeScript front-end (Vite, Capacitor wrapper for Android/iOS)
rust/        WebAssembly polygon lookup (FlatGeobuf + point-in-polygon)
scripts/     Build/deploy helpers
web/         Static demo of the WASM polygon lookup
images/      App icons and marketing assets
```

The app itself lives in `app/`. See `app/CLAUDE.md` for the project's
internal architecture notes.

## Development

```bash
cd app
yarn install
yarn dev        # Vite dev server with HMR
yarn build      # Production build
yarn lint       # ESLint
```

### Bootstrapping a new development machine

**Install [git-lfs](https://git-lfs.com/) before cloning.** The two `.fgb` polygon
layers are stored in LFS; without it they arrive as small pointer files and the
polygon lookup fails at runtime.

A fresh clone is otherwise still not enough to build — `app/src/pkg/` is untracked
and the climate rasters are generated, not stored.

| Missing | Effect |
|---|---|
| `app/src/pkg/` | **`yarn build` fails.** `lib/polylookup.ts` imports it statically. |
| `precip_*`, `et0_*` rasters | App runs; no precipitation or ET₀, so most modules cannot calculate. |
| `.fgb` layers as LFS pointers | App runs; no climate zone, soil class must be set by hand. |

Short version, in order:

```bash
git lfs install                 # once per machine
git clone git@github.com:ATB-Potsdam/M590-App.git && cd M590-App

# 1. WASM lookup module — required, or the build fails
cd rust && rustup target add wasm32-unknown-unknown && cargo install wasm-pack
wasm-pack build --release --target web && cp -r pkg ../app/src/ && cd ..

# 2. Climate rasters — downloads from DWD CDC, a few minutes
./scripts/build_all.sh

# 3. App
cd app && yarn install && yarn dev
```

If you cloned before installing git-lfs, run `git lfs install && git lfs pull`.
Check with `ls -l app/public/data/*.fgb`: real files are 2.8 MB and 28.7 MB, LFS
pointers are a few hundred bytes.

Details on each step follow.

**1. Climate rasters — generated, run this:**

```bash
./scripts/build_all.sh    # creates a venv, downloads from DWD CDC, writes app/public/data/
```

`build_all.sh` is only a wrapper: it creates `scripts/.venv`, installs
`scripts/requirements.txt` (numpy), and then calls `scripts/build_raster.py` once
per raster. That script does the work — it downloads the monthly `.asc.gz` grids
from `opendata.dwd.de` (CDC), stacks them into a compact `uint16` binary and
writes a `.meta.json` describing grid, CRS, scale and the months contained.
Together ~20 downloads, a few minutes. Reproducible: the same period and month
range yield byte-identical output (verified by checksum).

To rebuild a single raster, call it directly — numpy is the only dependency:

```bash
python3 scripts/build_raster.py --type precip --months 1-12     # writes app/public/data/
python3 scripts/build_raster.py --type et0    --months 3-10
python3 scripts/build_raster.py --type precip --months 1-12 --out-dir /tmp/x   # elsewhere
```

Downloads are cached under `scripts/.cache/<type>/`, so a re-run after a failed
network fetch resumes rather than starting over. The output filename encodes the
month span (`_full_year`, `_mar_oct`), so a changed `--months` cannot silently
overwrite a raster with different coverage — but note that `app/src/lib/rasterData.ts`
hardcodes the two expected basenames, so a different span needs that file updated
as well.

The two month ranges differ on purpose and must not be unified:

| Raster | Months | Why |
|---|---|---|
| `precip` | 1–12 | The sport/green modules classify by **annual** precipitation (Tabelle 33/34/36, "je nach Höhe des Jahresniederschlags"). A Mar–Oct sum is 150–350 mm short and overstates demand by a whole precipitation class. |
| `et0` | 3–10 | Only used for the monthly KWB correction over a crop's irrigation period (`gemuese_obst`); never summed annually. |

**2. Polygon layers — stored in git-lfs, nothing to run:**

`Klimaraeume.fgb` (KWBv zones A–H, from the DWA-M 590 annex) and `nfkwe.fgb`
(nFKWe classes, from BÜK 200/1000) are prepared GIS exports with no build recipe
in this repository. Because they cannot be regenerated from source here, they are
committed via git-lfs rather than passed between machines by hand; `git clone`
with lfs installed brings them down ready to use.

They are the one exception to the `app/public/data/` ignore rule (see
`.gitattributes` and `.gitignore`). Everything else in that directory is generated.

**3. WASM lookup module — required for the build to succeed:**

`app/src/pkg/` holds the point-in-polygon lookup compiled from the Rust crate in
`rust/`. `app/src/lib/polylookup.ts` imports it statically ("so Vite bundles it"),
so without it `yarn build` fails — unlike the data files, whose absence only
degrades the running app.

```bash
cd rust
rustup target add wasm32-unknown-unknown
cargo install wasm-pack
wasm-pack build --release --target web
cp -r pkg ../app/src/          # also ../web/ for the standalone WASM demo
```

The same commands sit in a disabled `if false` block at the top of
`scripts/build.sh`; that script otherwise builds and runs the C/Python lookup
tests. Neither `rust/pkg/` nor `app/src/pkg/` is tracked, so this step is needed
once per machine and again whenever the Rust source changes.

### Deployment

```bash
./scripts/deploy.sh
```

Runs `yarn build` and rsyncs `app/dist/` to the live host. Vite copies
`app/public/data/` into `dist/`, so **whatever is in that directory at build time
is what goes live** — including a stale or wrongly generated raster.

The script therefore refuses to deploy unless the geodata checks out, before the
build and again on `dist/` afterwards:

- Both `.fgb` layers exist and start with the FlatGeobuf magic bytes. This catches
  the git-lfs case, where a clone made without lfs leaves 132-byte pointer files
  that build fine and break the polygon lookup at runtime.
- The precipitation raster covers months 1–12, not just Mar–Oct.

Each failure names the fix (`git lfs pull` or `./scripts/build_all.sh`) and exits
non-zero before anything is uploaded.

Mobile builds:

```bash
yarn build:android   # build + sync + open Android Studio
yarn build:ios       # build + sync + open Xcode
```

Yarn 4 (Corepack) is required — do not use npm.

## License

This project is licensed under the [Apache License 2.0](LICENSE).

## Citation

If you use this software in academic work, please cite it using the metadata
in [CITATION.cff](CITATION.cff). GitHub renders a "Cite this repository"
button on the repo page based on that file.

## Authors

- Stephan Hantigk, [runlevel3 GmbH](https://www.runlevel3.de)
- [Leibniz-Institut für Agrartechnik und Bioökonomie e.V. (ATB)](https://www.atb-potsdam.de)
