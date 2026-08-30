#!/bin/bash
#
# Full release: bump the version, deploy the web app, build and publish Android.
#
# Usage:
#   scripts/release.sh                    # bump, web deploy, Play internal track
#   scripts/release.sh --screenshots      # re-capture store screenshots first
#   scripts/release.sh --track beta       # Play track (default: internal)
#   scripts/release.sh --dry-run          # show every step, change nothing
#   scripts/release.sh --no-web           # skip the web deploy
#   scripts/release.sh --no-play          # skip the Play upload
#
# The order matters and is not interchangeable:
#
#   1. bump       yarn bump raises package.json patch, android versionCode and
#                 versionName. Everything downstream must build from the bumped
#                 numbers, so nothing may be built before this.
#   2. checks     release-notes budget, clean tree. Cheap, and a failure here
#                 costs nothing — unlike a failure after the web is already live.
#   3. web        scripts/deploy.sh builds and rsyncs to the live host.
#   4. android    scripts/buildAndroid.sh (signed .aab) then deployAndroid.py.
#
# Web before Android is deliberate: the app's update banner compares against the
# deployed web version, so a Play release that lands first would point users at a
# version the web does not serve yet.
#
# This script does NOT commit or push. The bump touches tracked files and the
# release notes usually want editing in the same commit, so the commit stays a
# deliberate step — see the reminder printed at the end.

set -euo pipefail

cd "$(dirname "$0")/.."

fail() { echo "RELEASE ABORTED: $*" >&2; exit 1; }
step() { echo; echo "=== $* ==="; }

TRACK=internal
DRY_RUN=no
DO_WEB=yes
DO_PLAY=yes
SCREENSHOTS=no

while [ $# -gt 0 ]; do
    case "$1" in
        --track) TRACK="${2:?--track needs a value}"; shift 2 ;;
        --dry-run) DRY_RUN=yes; shift ;;
        --no-web) DO_WEB=no; shift ;;
        --no-play) DO_PLAY=no; shift ;;
        --screenshots) SCREENSHOTS=yes; shift ;;
        *) fail "unknown argument '$1'" ;;
    esac
done

# --- Pre-flight --------------------------------------------------------------
#
# Everything that can be checked without side effects happens first. A release
# that dies after the web deploy but before Play leaves the two out of step, so
# the cheap checks are worth front-loading.

step "Pre-flight"

# A dirty tree means the bump lands on top of unrelated edits, and it becomes
# impossible to tell afterwards what was released. Untracked files are fine —
# scratch images and data/ live in this working copy.
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    fail "working tree has uncommitted changes. Commit or stash them first:
$(git status --short --untracked-files=no)"
fi

current_branch="$(git rev-parse --abbrev-ref HEAD)"
echo "branch: $current_branch"

# The Play Console silently truncates an over-long "What's new", so check the
# rolling window before it is uploaded rather than after users see a cut sentence.
python3 scripts/check-release-notes.py || fail "release notes are over the Play budget"

old_version="$(node -p "require('./app/package.json').version")"
echo "current version: $old_version"

if [ "$DRY_RUN" = yes ]; then
    echo
    echo "[dry-run] would bump from $old_version, then:"
    # Full if-blocks, not `[ ... ] && echo`: the latter returns non-zero when the
    # test fails and would trip `set -e` on the last line of the block.
    if [ "$DO_WEB" = yes ]; then echo "[dry-run]   deploy the web app to the live host"; fi
    if [ "$SCREENSHOTS" = yes ]; then echo "[dry-run]   re-capture store screenshots"; fi
    if [ "$DO_PLAY" = yes ]; then echo "[dry-run]   build a signed .aab and publish to track $TRACK"; fi
    echo
    echo "Running the Play step in dry-run to show the listing diff:"
    if [ "$DO_PLAY" = yes ]; then
        python3 scripts/deployAndroid.py --dry-run --track "$TRACK" || true
    fi
    exit 0
fi

# --- 1. Bump -----------------------------------------------------------------

step "Bump version"
(cd app && yarn bump)
new_version="$(node -p "require('./app/package.json').version")"
version_code="$(grep -oP 'versionCode\s+\K\d+' app/android/app/build.gradle)"
echo "version $old_version -> $new_version (versionCode $version_code)"

# --- 2. Web ------------------------------------------------------------------

if [ "$DO_WEB" = yes ]; then
    step "Deploy web"
    scripts/deploy.sh
else
    echo "skipping web deploy (--no-web)"
fi

# --- 3. Android --------------------------------------------------------------

if [ "$DO_PLAY" = yes ]; then
    step "Build signed Android bundle"
    scripts/buildAndroid.sh

    step "Publish to Play (track $TRACK)"
    play_args=(--track "$TRACK")
    if [ "$SCREENSHOTS" = yes ]; then play_args+=(--screenshots); fi
    python3 scripts/deployAndroid.py "${play_args[@]}"
else
    echo "skipping Play upload (--no-play)"
fi

# --- Done --------------------------------------------------------------------

step "Released $new_version"
cat <<EOF
The bump touched tracked files; they are not committed yet.

    git add app/package.json app/android/app/build.gradle
    git commit -m "chore(release): $new_version"

If this release carried user-visible changes, append a bullet to
app/release-notes/STORE-TEXT.txt and add app/release-notes/$new_version.md
in the same commit.
EOF
