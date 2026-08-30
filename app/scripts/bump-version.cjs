const fs = require("fs");
const path = require("path");

// --no-version-code sets versionName only and leaves versionCode alone.
//
// scripts/buildAndroid.sh raises versionCode unconditionally on every release
// build, by design: a standalone build has no other source of a fresh code, and
// Play rejects a code it has already accepted. A bump-then-build sequence
// therefore advanced it twice. Play only requires uniqueness, not contiguity, so
// that was harmless — but it made the number in a release commit differ from the
// one actually uploaded, which is confusing when tracing a release afterwards.
// scripts/release.sh passes this flag so exactly one increment happens per
// release, in buildAndroid.sh.
const skipVersionCode = process.argv.includes("--no-version-code");

// package.json version erhöhen (patch: 1.0.3 → 1.0.4)
const pkgPath = path.resolve(__dirname, "../package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

const [major, minor, patch] = pkg.version.split(".").map(Number);
const newPatch = patch + 1;
pkg.version = `${major}.${minor}.${newPatch}`;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

// android/app/build.gradle aktualisieren
const gradlePath = path.resolve(__dirname, "../android/app/build.gradle");
let gradle = fs.readFileSync(gradlePath, "utf8");

// versionCode hochzählen
if (!skipVersionCode) {
    gradle = gradle.replace(/versionCode\s+(\d+)/, (_, code) => {
        return `versionCode ${parseInt(code) + 1}`;
    });
}

// versionName auf package.json version setzen
gradle = gradle.replace(
    /versionName\s+"[^"]+"/,
    `versionName "${pkg.version}"`,
);

fs.writeFileSync(gradlePath, gradle);

const code = gradle.match(/versionCode\s+(\d+)/)?.[1];
console.log(
    `✅ Version bumped to ${pkg.version}` +
    (skipVersionCode
        ? ` (versionCode left at ${code}; the release build raises it)`
        : ` (versionCode ${code})`),
);
