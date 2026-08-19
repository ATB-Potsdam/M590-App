#!/bin/bash
#
# Build the Android release bundle (.aab) for upload to the Play Console,
# headlessly — no Android Studio involved.
#
# Usage:
#   scripts/buildAndroid.sh             # release .aab; prompts for the password
#   scripts/buildAndroid.sh --apk       # debug APK for sideloading instead
#
#   # unattended (CI): the prompt is skipped when the variables are already set
#   M590_KEYSTORE_PASSWORD=... M590_KEY_PASSWORD=... scripts/buildAndroid.sh
#
# Signing material never lives in the repository. The keystore path and alias
# default to the values below. The passwords are resolved in this order:
#
#   1. the environment (M590_KEYSTORE_PASSWORD / M590_KEY_PASSWORD) — for CI
#   2. app/android/keystore.properties, if present — gitignored, chmod 600,
#      sourced as shell (see scripts/keystore.properties.example)
#   3. an interactive prompt
#
# Without them the build would still run but produce an UNSIGNED bundle, which
# the Play Console rejects, so the release path refuses to continue.
#
# Each release build raises versionCode in app/android/app/build.gradle, because
# Play refuses an upload at a versionCode it has already accepted. versionName is
# NOT touched here — it tracks the deployed web release; move it with `yarn bump`.
# The bumped build.gradle is a real edit and wants committing with the release.
#
# Three environment obstacles are handled here because each one cost a debugging
# session before:
#
#   - `cap sync` needs Node >= 22 while the project otherwise runs on Node 21
#     (which also blocks the vite/react-router majors). Without the sync,
#     capacitor-cordova-android-plugins/ and the web assets under
#     app/android/app/src/main/assets/public/ are missing and Gradle fails.
#   - Gradle needs JDK 21. The system default here is JDK 25, which the Android
#     Gradle Plugin does not accept, so JAVA_HOME is pinned explicitly.
#   - The build needs SDK platform 36 (targetSdk 36 is a Play requirement).
#     Its absence surfaces as a confusing "failed to find target" from Gradle,
#     so it is checked up front.

set -euo pipefail

cd "$(dirname "$0")/.."

# The upload key created by scripts/createUploadKeystore.sh, which replaced the
# old ~/andoid-keystore/DWA-M590.jks after its password was lost. Both values
# match what that script writes; override per build with M590_KEYSTORE /
# M590_KEY_ALIAS if a different key is ever needed.
readonly KEYSTORE_DEFAULT="app/android/upload-keystore.jks"
readonly KEY_ALIAS_DEFAULT="upload"

# Optional, gitignored file holding the signing passwords so they need not be
# retyped for every build. Sourced as shell; see the signing block below.
readonly KEYSTORE_PROPS="app/android/keystore.properties"
readonly NODE_VERSION=22
# ANDROID_HOME wins; otherwise try the usual locations. ~/Android/Sdk is what the
# command-line tools and Android Studio both use by default, /opt/android-sdk is
# the common system-wide install.
if [ -n "${ANDROID_HOME:-}" ]; then
    ANDROID_SDK="$ANDROID_HOME"
elif [ -d "$HOME/Android/Sdk" ]; then
    ANDROID_SDK="$HOME/Android/Sdk"
else
    ANDROID_SDK=/opt/android-sdk
fi
readonly ANDROID_SDK
readonly COMPILE_SDK=36

fail() { echo "BUILD ABORTED: $*" >&2; exit 1; }
info() { echo "==> $*"; }

target=bundle
case "${1:-}" in
    --apk) target=apk ;;
    "") ;;
    *) fail "unknown argument '$1' (expected --apk or nothing)" ;;
esac

# --- Toolchain checks --------------------------------------------------------

# Gradle/AGP needs JDK 21 specifically; newer defaults are rejected. The install
# path differs per distribution (java-21-openjdk-amd64 on Debian/Ubuntu,
# java-21-openjdk on Arch, /usr/lib/jvm/jdk-21* elsewhere), so search rather than
# hardcode, and honour an explicit JAVA_HOME_21 if the caller sets one.
find_jdk21() {
    if [ -n "${JAVA_HOME_21:-}" ]; then
        [ -x "$JAVA_HOME_21/bin/javac" ] && { echo "$JAVA_HOME_21"; return 0; }
        return 1
    fi
    # A JAVA_HOME already pointing at a 21 JDK wins — the caller chose it.
    if [ -n "${JAVA_HOME:-}" ] && [ -x "$JAVA_HOME/bin/javac" ] \
       && "$JAVA_HOME/bin/javac" -version 2>&1 | grep -q " 21\."; then
        echo "$JAVA_HOME"; return 0
    fi
    local candidate
    for candidate in /usr/lib/jvm/java-21-openjdk-amd64 \
                     /usr/lib/jvm/java-21-openjdk \
                     /usr/lib/jvm/java-1.21.0-openjdk-amd64 \
                     /usr/lib/jvm/jdk-21* \
                     /usr/lib/jvm/temurin-21* \
                     /Library/Java/JavaVirtualMachines/*-21.jdk/Contents/Home; do
        [ -x "$candidate/bin/javac" ] || continue
        "$candidate/bin/javac" -version 2>&1 | grep -q " 21\." || continue
        echo "$candidate"; return 0
    done
    return 1
}

JAVA_HOME_21="$(find_jdk21 || true)"
[ -n "$JAVA_HOME_21" ] || fail \
    "no JDK 21 found. Gradle/AGP does not accept newer JDKs.
    Install one (Debian/Ubuntu: apt install openjdk-21-jdk) or point JAVA_HOME_21 at it."
export JAVA_HOME="$JAVA_HOME_21"

[ -d "$ANDROID_SDK" ] || fail "Android SDK not found at $ANDROID_SDK. Set ANDROID_HOME."
export ANDROID_HOME="$ANDROID_SDK"

[ -d "$ANDROID_SDK/platforms/android-$COMPILE_SDK" ] || fail \
    "SDK platform $COMPILE_SDK is missing. Install it with:
    sdkmanager \"platforms;android-$COMPILE_SDK\" \"build-tools;$COMPILE_SDK.0.0\""

# app/android/local.properties tells Gradle where the SDK is; it is gitignored,
# so a fresh clone has to be told once.
if [ ! -f app/android/local.properties ]; then
    info "writing app/android/local.properties (sdk.dir=$ANDROID_SDK)"
    echo "sdk.dir=$ANDROID_SDK" > app/android/local.properties
fi

# --- Node 22 for the Capacitor sync -----------------------------------------

# fnm is usually put on PATH by an interactive shell's rc file, which does not run
# for a script, so look in its default install location too.
if ! command -v fnm >/dev/null 2>&1; then
    for fnm_dir in "${FNM_PATH:-}" "$HOME/.local/share/fnm" "$HOME/.fnm"; do
        [ -n "$fnm_dir" ] && [ -x "$fnm_dir/fnm" ] && { PATH="$fnm_dir:$PATH"; break; }
    done
fi

if command -v fnm >/dev/null 2>&1; then
    eval "$(fnm env --shell bash)"
    fnm use "$NODE_VERSION" >/dev/null 2>&1 || fail "fnm cannot select Node $NODE_VERSION. Install it: fnm install $NODE_VERSION"
elif [ -s /usr/share/nvm/init-nvm.sh ]; then
    # shellcheck disable=SC1091
    . /usr/share/nvm/init-nvm.sh
    nvm use "$NODE_VERSION" >/dev/null || fail "nvm cannot select Node $NODE_VERSION."
fi

node_major="$(node -p 'process.versions.node.split(".")[0]')"
[ "$node_major" -ge "$NODE_VERSION" ] || fail \
    "Node $node_major is active but 'cap sync' needs >= $NODE_VERSION. Install fnm/nvm or switch manually."
info "Node $(node -v), JDK 21 ($JAVA_HOME_21), SDK $ANDROID_SDK"

# --- Signing -----------------------------------------------------------------

# Only relevant for the release bundle; the debug APK uses the debug keystore.
if [ "$target" = bundle ]; then
    M590_KEYSTORE="${M590_KEYSTORE:-$KEYSTORE_DEFAULT}"
    # Gradle resolves a relative storeFile against app/android/app/, not the repo
    # root, and a path that misses there disables signing *silently* — the build
    # succeeds and the bundle is unsigned. Always hand Gradle an absolute path.
    case "$M590_KEYSTORE" in
        /*) ;;
        *) M590_KEYSTORE="$PWD/$M590_KEYSTORE" ;;
    esac
    export M590_KEYSTORE
    export M590_KEY_ALIAS="${M590_KEY_ALIAS:-$KEY_ALIAS_DEFAULT}"

    # A keystore is deliberately NOT auto-created here: generating signing material
    # as a side effect of a build produces a bundle signed by a key nobody has
    # registered, and that only surfaces as a rejection at upload time.
    if [ ! -f "$M590_KEYSTORE" ]; then
        fail "keystore not found at $M590_KEYSTORE.
    Point M590_KEYSTORE at an existing one, or — if the upload key is lost —
    create a replacement and register it with the Play Console:
        scripts/createUploadKeystore.sh"
    fi

    # Passwords come from the environment (CI) or, failing that, an interactive
    # prompt. Prompting is preferred day to day: an inline M590_..._PASSWORD=...
    # ends up in the shell history, and an exported one is readable via
    # /proc/<pid>/environ. Read from /dev/tty rather than stdin so the prompt
    # still works when the script's stdin is redirected, and only when a
    # terminal is actually attached — otherwise an unattended run would block
    # forever instead of failing.
    # /dev/tty can exist but not be openable (cron, a detached process), so test
    # by actually opening it rather than with -e.
    has_tty=no
    if (: < /dev/tty) 2>/dev/null; then
        has_tty=yes
    fi

    # Between the environment and the prompt sits an optional properties file, so
    # the passwords can be stored once on a workstation instead of retyped per
    # build. It is gitignored (app/android/.gitignore) and read with `.` rather
    # than parsed, so only shell-assignment syntax belongs in it:
    #
    #   M590_KEYSTORE_PASSWORD=...
    #   M590_KEY_PASSWORD=...          # omit if identical to the store password
    #
    # The environment still wins, so a CI run or a one-off override is unaffected
    # by a file left on disk. Refuse a world/group-readable file: the whole point
    # is to keep the password off other users' terminals, and 0644 here would be
    # a false sense of safety rather than an inconvenience.
    if [ -f "$KEYSTORE_PROPS" ]; then
        # stat drops leading zeros (a 0600 file reports "600", a 0044 one "44"),
        # so pad to three digits before splitting off the group/other digits.
        perms=$(stat -c%a "$KEYSTORE_PROPS")
        case "${#perms}" in
            1) perms="00$perms" ;;
            2) perms="0$perms" ;;
        esac
        if [ "${perms#?}" != "00" ]; then
            fail "$KEYSTORE_PROPS is accessible to group or others (mode $perms).
    Restrict it before building:  chmod 600 \"$KEYSTORE_PROPS\""
        fi
        # Sourcing overwrites variables unconditionally, so stash whatever the
        # environment already provided and restore it afterwards — otherwise a
        # stored password would silently beat an explicit inline override, which
        # is the opposite of the documented precedence.
        env_store="${M590_KEYSTORE_PASSWORD:-}"
        env_key="${M590_KEY_PASSWORD:-}"
        # shellcheck source=/dev/null
        . "$KEYSTORE_PROPS"
        # Plain `[ ... ] && assignment` would return non-zero when the test fails
        # and trip `set -e`, so keep these as full if-blocks.
        if [ -n "$env_store" ]; then M590_KEYSTORE_PASSWORD="$env_store"; fi
        if [ -n "$env_key" ]; then M590_KEY_PASSWORD="$env_key"; fi
        info "read signing passwords from $KEYSTORE_PROPS"
    fi

    if [ -z "${M590_KEYSTORE_PASSWORD:-}" ]; then
        [ "$has_tty" = yes ] || fail \
            "no keystore password available and there is no terminal to prompt on.
    Either set M590_KEYSTORE_PASSWORD and M590_KEY_PASSWORD in the environment,
    or put them in $KEYSTORE_PROPS (chmod 600)."
        printf 'Keystore password for %s: ' "$(basename "$M590_KEYSTORE")" > /dev/tty
        IFS= read -rs M590_KEYSTORE_PASSWORD < /dev/tty
        echo > /dev/tty
        [ -n "$M590_KEYSTORE_PASSWORD" ] || fail "no keystore password entered."
    fi

    if [ -z "${M590_KEY_PASSWORD:-}" ]; then
        if [ "$has_tty" = yes ]; then
            printf 'Password for key "%s" [empty = same as keystore]: ' "$M590_KEY_ALIAS" > /dev/tty
            IFS= read -rs M590_KEY_PASSWORD < /dev/tty
            echo > /dev/tty
        fi
        # Most keystores use one password for both; treat an empty answer as
        # "same as the store password" rather than as an empty key password.
        M590_KEY_PASSWORD="${M590_KEY_PASSWORD:-$M590_KEYSTORE_PASSWORD}"
    fi

    export M590_KEYSTORE_PASSWORD M590_KEY_PASSWORD

    # Fail before the multi-minute build rather than at the signing step at the
    # very end, which is where a wrong password would otherwise surface.
    if ! "$JAVA_HOME/bin/keytool" -list -keystore "$M590_KEYSTORE" -alias "$M590_KEY_ALIAS" \
            -storepass "$M590_KEYSTORE_PASSWORD" > /dev/null 2>&1; then
        fail "cannot open $M590_KEYSTORE with alias '$M590_KEY_ALIAS' and the given password.
    List the aliases with: keytool -list -keystore \"$M590_KEYSTORE\"
    Then pass the right one via M590_KEY_ALIAS=..."
    fi
    info "keystore unlocked, alias '$M590_KEY_ALIAS'"
fi

# --- Build -------------------------------------------------------------------

cd app

info "installing dependencies (yarn --immutable)"
yarn install --immutable

info "building web assets (vite, mode=android)"
yarn build --mode android

info "syncing web assets into the Android project (cap sync)"
yarn cap:sync:android

cd android

if [ "$target" = apk ]; then
    info "assembling debug APK"
    ./gradlew assembleDebug
    artifact=app/build/outputs/apk/debug/app-debug.apk
else
    # The Play Console rejects an upload whose versionCode it has already seen, so
    # every release bundle needs a fresh one. Without this the second build of a
    # version produced a bundle that looked fine and failed at upload time.
    #
    # Only versionCode moves here. versionName stays put on purpose: it ties the
    # bundle to the deployed web release (and to app/release-notes/<version>.*),
    # and a build must not silently claim a version the website does not serve.
    # Use `yarn bump` to move versionName — that bumps versionCode too, so a
    # bump-then-build sequence advances it once via bump and once here, which is
    # harmless: uniqueness is all Play requires, not contiguity.
    #
    # This bump is unconditional, and that is the whole point. Do NOT edit
    # versionCode by hand beforehand to make a build land on a particular number
    # — not to reuse a code whose bundle was never uploaded, not to keep the
    # sequence gapless. Play only cares that a code is higher than the last one
    # it accepted, so gaps are free and hand-editing is pure risk: rebuilding a
    # release then silently produces a duplicate code, which fails at upload
    # time rather than here.
    current_code=$(grep -oP 'versionCode \K\d+' app/build.gradle)
    [ -n "$current_code" ] || fail "could not read versionCode from app/build.gradle."
    next_code=$((current_code + 1))
    # Match the exact line to avoid touching a comment that mentions versionCode.
    sed -i -E "s/^([[:space:]]*)versionCode[[:space:]]+${current_code}\$/\1versionCode ${next_code}/" app/build.gradle
    grep -q "versionCode ${next_code}" app/build.gradle \
        || fail "failed to raise versionCode from ${current_code} to ${next_code}."
    info "versionCode ${current_code} → ${next_code}"

    info "building signed release bundle"
    ./gradlew bundleRelease
    artifact=app/build/outputs/bundle/release/app-release.aab
fi

[ -f "$artifact" ] || fail "expected artifact $artifact was not produced."

# --- Verify ------------------------------------------------------------------

# A missing signingConfig makes Gradle's signRelease* task a silent no-op, so the
# signature is verified rather than assumed.
if [ "$target" = bundle ]; then
    if unzip -l "$artifact" | grep -qE 'META-INF/.*\.(RSA|DSA|EC)$'; then
        info "bundle is signed"
    else
        fail "$artifact is UNSIGNED — the Play Console will reject it. Check the signing environment variables."
    fi
fi

# Put the release notes beside the bundle, so whoever uploads to the Play Console
# has the "What's new" text to hand instead of reconstructing it from git log. The
# tracked copy under app/release-notes/ is the original; this one lands in
# build/outputs/, which Gradle wipes on a clean build.
if [ "$target" = bundle ]; then
    version=$(grep -oP 'versionName "\K[^"]+' app/build.gradle)
    outdir=$(dirname "$artifact")

    # STORE-TEXT.txt is the "What's new" text as it currently stands: newest
    # bullets appended, oldest dropped to stay under Play's limit. It is never
    # emptied, so it is always ready to paste — see app/release-notes/README.md.
    store_text="../release-notes/STORE-TEXT.txt"
    if [ -f "$store_text" ]; then
        # Over 500 characters the Play Console truncates mid-sentence, which is
        # only noticed once users read it. Fail here instead.
        if ! python3 ../../scripts/check-release-notes.py "$store_text"; then
            fail "STORE-TEXT.txt is over the Play Console's 500-character limit — drop the oldest bullets."
        fi
        cp "$store_text" "$outdir/RELEASE-NOTES-$version.txt"
        info "store text copied next to the bundle"
    else
        # Not fatal: the bundle is fine, but the upload step would be missing its
        # store text, so say so rather than failing silently.
        info "NOTE: no app/release-notes/STORE-TEXT.txt — the upload would have no What's-new text"
    fi

    # The per-version .md, when one exists, is the technical record; ship it too.
    if [ -f "../release-notes/$version.md" ]; then
        cp "../release-notes/$version.md" "$outdir/RELEASE-NOTES-$version.md"
    fi
fi

echo
info "$(cd "$PWD" && pwd)/$artifact"
ls -lh "$artifact" | awk '{print "    size: " $5}'
grep -E 'versionCode|versionName' app/build.gradle | sed 's/^ */    /'
