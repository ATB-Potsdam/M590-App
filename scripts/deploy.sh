#!/bin/bash
#
# Build and deploy to the live host.
#
# Vite copies app/public/data/ into dist/, so whatever sits there at build time
# is what goes live. Two failure modes are silent and have both happened, hence
# the checks below:
#
#   - .fgb layers are stored in git-lfs. Cloning without lfs installed leaves
#     132-byte pointer files that look fine to the build and break the polygon
#     lookup at runtime (no climate zone, no soil class).
#   - The precipitation raster must cover all twelve months. A Mar-Oct raster
#     makes the annual sum 150-350 mm too low, which drops sites into a lower
#     precipitation class and overstates demand for weinbau, naturrasen, golf
#     and tennen.

set -euo pipefail

cd "$(dirname "$0")/../app"

fail() { echo "DEPLOY ABORTED: $*" >&2; exit 1; }

# --- Pre-build: verify the sources Vite is about to copy ---------------------

for f in Klimaraeume.fgb nfkwe.fgb; do
    path="public/data/$f"
    [ -f "$path" ] || fail "$path is missing. Install git-lfs and run 'git lfs pull'."

    # FlatGeobuf magic bytes: 66 67 62 03 ("fgb\3"). An LFS pointer starts with
    # the ASCII text "version https://git-lfs...", so this catches pointers,
    # truncation and corruption in one check.
    magic=$(head -c 4 "$path" | xxd -p)
    if [ "$magic" != "66676203" ]; then
        size=$(stat -c%s "$path")
        if head -c 40 "$path" | grep -q "git-lfs"; then
            fail "$path is a git-lfs pointer ($size bytes), not the real file. Run 'git lfs pull'."
        fi
        fail "$path is not a FlatGeobuf file (magic $magic, $size bytes)."
    fi
done

python3 - <<'PY' || exit 1
import json, sys, pathlib

# The month span and the source product both matter: a Mar-Oct precipitation
# raster shifts every sport/green precipitation class, and an ET0 raster built
# from evapo_p (AMBAV/Haude) instead of FAO-56 puts the KWB correction on a
# basis the Merkblatt does not allow. Both are silent failures in the UI.
for name, expect_months, expect_source in [
    ("preciphyras_1991-2020_full_year", list(range(1, 13)), "hyras_de"),
    ("et0fao_1991-2020_mar_oct",        list(range(3, 11)), "evaporation_fao"),
]:
    meta = pathlib.Path(f"public/data/{name}.meta.json")
    if not meta.exists():
        sys.exit(f"DEPLOY ABORTED: raster {name} missing. Run ./scripts/build_all.sh")
    m = json.loads(meta.read_text())
    if m["months"] != expect_months:
        sys.exit(f"DEPLOY ABORTED: {name} covers months {m['months']}, "
                 f"expected {expect_months}. Run ./scripts/build_all.sh")
    if expect_source not in m.get("source", ""):
        sys.exit(f"DEPLOY ABORTED: {name} was not built from {expect_source} "
                 f"(source={m.get('source', '<missing>')}). Run ./scripts/build_all.sh")
PY

echo "Geodata OK (.fgb layers intact, rasters are HYRAS + FAO-56 with the right spans)"

# --- Build -------------------------------------------------------------------

yarn build

# --- Post-build: verify what actually ships ----------------------------------

for f in Klimaraeume.fgb nfkwe.fgb; do
    [ -f "dist/data/$f" ] || fail "dist/data/$f missing after build."
    [ "$(head -c 4 "dist/data/$f" | xxd -p)" = "66676203" ] \
        || fail "dist/data/$f is not a FlatGeobuf file — do not deploy."
done

# --- Deploy ------------------------------------------------------------------

rsync -avH --delete --checksum --inplace --no-times \
    dist/ tesla.runlevel3.de:/var/www/vhosts/dwa.runlevel3.de/
