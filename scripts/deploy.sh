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

# --- Post-deploy: the service worker must not be HTTP-cached -----------------
#
# sw.js is how a client discovers that anything changed. If the browser's HTTP
# cache is allowed to keep it, the client never re-fetches it and can never move
# off the version it first installed — a reload does nothing, and the update
# banner (correctly) keeps reporting an old running version forever.
#
# This is exactly what happened on 2026-08-19: nginx's generic
# snippets/cache-expire.conf matches `js$`, which catches sw.js, and served it
# with `expires max` (max-age=315360000, ten years, public). A phone sat on
# 0.1.52 across reloads while the server had 0.1.54.
#
# Warn rather than fail: the deploy itself succeeded and the files are correct;
# what is wrong is the server config, which this script cannot change.
sw_cc=$(curl -sI "https://dwa.runlevel3.de/sw.js" | tr -d '\r' \
    | grep -i '^cache-control:' | head -1 || true)
case "$sw_cc" in
    *no-cache*|*no-store*|*max-age=0*)
        echo "sw.js cache headers OK (${sw_cc:-none})" ;;
    "")
        echo "WARNING: sw.js sends no Cache-Control header." >&2
        echo "  Browsers then heuristically cache it, which can strand clients" >&2
        echo "  on an old version. Serve it with 'no-cache'." >&2 ;;
    *)
        echo "WARNING: sw.js is HTTP-cacheable — clients may never see this deploy." >&2
        echo "  Got: $sw_cc" >&2
        echo "  Fix in the nginx vhost for dwa.runlevel3.de, BEFORE the generic" >&2
        echo "  js/css caching rule (snippets/cache-expire.conf):" >&2
        echo "" >&2
        echo "      location = /sw.js {" >&2
        echo "          add_header Cache-Control \"no-cache\" always;" >&2
        echo "          expires -1;" >&2
        echo "      }" >&2
        echo "      location = /index.html {" >&2
        echo "          add_header Cache-Control \"no-cache\" always;" >&2
        echo "          expires -1;" >&2
        echo "      }" >&2
        echo "" >&2
        echo "  The hashed files under assets/ SHOULD stay long-cached: their" >&2
        echo "  names change every build, so they can never go stale." >&2 ;;
esac
