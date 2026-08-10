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
meta = pathlib.Path("public/data/precip_1991-2020_full_year.meta.json")
if not meta.exists():
    sys.exit("DEPLOY ABORTED: precipitation raster missing. Run ./scripts/build_all.sh")
months = json.loads(meta.read_text())["months"]
if months != list(range(1, 13)):
    sys.exit(f"DEPLOY ABORTED: precipitation raster covers months {months}, expected 1-12. "
             "Run ./scripts/build_all.sh")
PY

echo "Geodata OK (.fgb layers intact, precipitation raster covers 12 months)"

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
