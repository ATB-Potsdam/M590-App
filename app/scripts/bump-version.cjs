const fs = require("fs");
const path = require("path");

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
gradle = gradle.replace(/versionCode\s+(\d+)/, (_, code) => {
    return `versionCode ${parseInt(code) + 1}`;
});

// versionName auf package.json version setzen
gradle = gradle.replace(
    /versionName\s+"[^"]+"/,
    `versionName "${pkg.version}"`,
);

fs.writeFileSync(gradlePath, gradle);

console.log(`✅ Version bumped to ${pkg.version}`);
