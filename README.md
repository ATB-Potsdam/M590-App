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
`scripts/requirements.txt` (numpy, netCDF4), and then calls
`scripts/build_raster_nc.py` once per raster. That script downloads the DWD
NetCDF products, aggregates them to a 30-year monthly mean, and writes a compact
`uint16` binary plus a `.meta.json` describing grid, CRS and the months contained.

**Which products, and why it matters.** Kapitel 4.2.3 of the Merkblatt names the
two inputs to the KWB explicitly, and the tables in Kapitel 4.3/4.4 are declared
valid *only* for them:

| Raster | Product | CDC path |
|---|---|---|
| `preciphyras` | HYRAS v6.1, monthly sums | `grids_germany/monthly/hyras_de/precipitation/` |
| `et0fao` | FAO-56 grass reference ET₀ (Allen et al. 1998) | `grids_germany/daily/evaporation_fao/` |

Earlier versions used `multi_annual/precipitation` and `multi_annual/evapo_p`.
The latter is **AMBAV/Haude — a different evaporation model, not FAO-56**, which
put the ΔKWB correction in `gemuese_obst` on a basis the Merkblatt does not
permit. Do not switch back; `scripts/deploy.sh` fails the deploy if
`meta.json → source` does not name the right product.

The two rasters do **not** share a grid: FAO-56 is 654 × 866 on EPSG:31467,
HYRAS is 665 × 890 on EPSG:3035 (ETRS89-LAEA). The app reprojects each raster
independently from `meta.crs`, so this is fine — but a new CRS must be added to
`CRS_DEFS` in `app/src/lib/rasterData.ts`, which otherwise throws on load.

To rebuild a single raster, call it directly:

```bash
python3 scripts/build_raster_nc.py --type precip_hyras --months 1-12
python3 scripts/build_raster_nc.py --type et0_fao      --months 3-10
python3 scripts/build_raster_nc.py --type et0_fao --months 3-10 --out-dir /tmp/x
```

FAO-56 is published only as daily grids, so the 30-year monthly mean means
streaming **~12 GB** (30 × ~395 MB). Years are downloaded one at a time and
deleted after use, so peak disk stays at ~400 MB; pass `--keep-cache` to keep
them for a rebuild and `--cache-dir` to place them on a roomier disk. HYRAS is a
single ~700 MB file already aggregated to monthly sums. Expect roughly 15–30
minutes on a fast connection.

The output filename encodes the month span (`_full_year`, `_mar_oct`), so a
changed `--months` cannot silently overwrite a raster with different coverage —
but note that `app/src/lib/rasterData.ts` hardcodes the two expected basenames,
so a different span needs that file updated as well.

The two month ranges differ on purpose and must not be unified:

| Raster | Months | Why |
|---|---|---|
| `preciphyras` | 1–12 | The sport/green modules classify by **annual** precipitation (Tabelle 33/34/36, "je nach Höhe des Jahresniederschlags"). A Mar–Oct sum is 150–350 mm short and overstates demand by a whole precipitation class. |
| `et0fao` | 3–10 | Only used for the monthly KWB correction over a crop's irrigation period (`gemuese_obst`); never summed annually. |

`scripts/build_raster.py` (the older ASCII/`multi_annual` builder) is kept for
reference and for comparing against the previous data basis. Its output is not
what the app ships.

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

### Android without Android Studio

Android Studio is only an IDE around the command-line tools; the app can be
built headlessly. Needs JDK 21 (`java -version`) and about 6 GB.

`scripts/buildAndroid.sh` does the whole build and checks the environment
obstacles listed below up front:

```bash
# release bundle (.aab) for the Play Console — prompts for the keystore password
scripts/buildAndroid.sh

# debug APK for sideloading, no signing material needed
scripts/buildAndroid.sh --apk

# unattended (CI): setting the variables skips the prompt
M590_KEYSTORE_PASSWORD=... M590_KEY_PASSWORD=... scripts/buildAndroid.sh
```

The password is prompted for without echo, which keeps it out of the shell
history and out of `/proc/<pid>/environ`. If the key password is the same as the
keystore password — the usual case — just press Enter at the second prompt. The
keystore is opened before the build starts, so a wrong password or alias fails in
seconds instead of at the signing step minutes later.

Signing material never lives in the repository. The keystore defaults to
`app/android/upload-keystore.jks` with alias `upload` — what
`scripts/createUploadKeystore.sh` writes — and both are gitignored. Override with
`M590_KEYSTORE` / `M590_KEY_ALIAS`, or put
`storeFile`/`storePassword`/`keyAlias`/`keyPassword` into
`app/android/keystore.properties` (also gitignored).

Use an **absolute** path for `storeFile`: Gradle resolves a relative one against
`app/android/app/`, not the repo root. A path that misses there used to disable
signing silently; the build now fails with the resolved path instead. The build
script always passes an absolute path.

A release build without signing material produces an **unsigned** bundle that the
Play Console rejects — Gradle's `signReleaseBundle` task is a silent no-op when
no `signingConfig` is set, so the script verifies the signature rather than
assuming it.

### Replacing a lost upload key

If the upload key's password is lost, `scripts/createUploadKeystore.sh` generates
a replacement and prints the steps to register it. It writes
`app/android/upload-keystore.jks` (gitignored, mode 600) plus the
`upload_certificate.pem` that the Play Console asks for.

This only works with **Play App Signing** enabled — Google then holds the actual
app signing key, and the upload key merely authenticates uploads, so resetting it
does not change the signature users see and installed apps keep updating. Verify
under *Release → Setup → App integrity → App signing* before generating anything;
without it, a new key cannot replace the original and the app would need a new
package name.

The build script never creates a keystore on its own: a bundle signed by an
unregistered key looks fine locally and fails only at upload.

Setting up the SDK once, on a machine that has none:

```bash
mkdir -p ~/Android/Sdk/cmdline-tools && cd ~/Android/Sdk/cmdline-tools
curl -O https://dl.google.com/android/repository/commandlinetools-linux-13114758_latest.zip
unzip -q commandlinetools-linux-*.zip && mv cmdline-tools latest
export ANDROID_HOME=$HOME/Android/Sdk
yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager \
    "platform-tools" "platforms;android-36" "build-tools;36.0.0"
```

Verify what was produced (`aapt2` reads APKs only, not `.aab` containers):

```bash
$ANDROID_HOME/build-tools/36.0.0/aapt2 dump badging \
    app/build/outputs/apk/debug/app-debug.apk | grep -E "^package|targetSdk"
```

Obstacles on a machine that has never run Android Studio:

- **`yarn cap:sync:android` needs Node ≥ 22**; the project otherwise runs on
  Node 21 (which also blocks the vite/react-router majors). Without the sync,
  `capacitor-cordova-android-plugins/` and the web assets under
  `app/android/app/src/main/assets/public/` are missing and Gradle fails. Use a
  Node 22 environment for the sync step; the Gradle build itself is fine on 21.
- **`app/android/gradle/gradle-daemon-jvm.properties`** is generated by Android
  Studio and pinned `toolchainVendor=jetbrains`. Gradle then refuses to use a
  non-JetBrains JDK 21 and cannot download one for Linux/x86_64. The line has
  been removed (keeping `toolchainVersion=21`); if Android Studio regenerates
  the file, drop it again.
- **The Android Gradle Plugin needs JDK 21**, but the system default here is
  JDK 25, which it rejects. The script pins `JAVA_HOME` to
  `/usr/lib/jvm/java-21-openjdk`; a manual `./gradlew` run has to do the same.
- **SDK platform 36 must be installed** (`targetSdk 36` is a Play requirement).
  If it is missing, Gradle fails with a confusing "failed to find target".
  Note the legacy `sdkmanager` under `$ANDROID_HOME/tools/bin` needs JDK 8
  (`JAVA_HOME=/usr/lib/jvm/java-8-openjdk`) — it uses `javax.xml.bind`, which
  was removed after Java 8.

## License

This project is licensed under the [Apache License 2.0](LICENSE).

## Citation

If you use this software in academic work, please cite it using the metadata
in [CITATION.cff](CITATION.cff). GitHub renders a "Cite this repository"
button on the repo page based on that file.

## Authors

- Stephan Hantigk, [runlevel3 GmbH](https://www.runlevel3.de)
- [Leibniz-Institut für Agrartechnik und Bioökonomie e.V. (ATB)](https://www.atb-potsdam.de)
