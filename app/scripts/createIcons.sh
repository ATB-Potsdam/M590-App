#!/usr/bin/env bash
set -euo pipefail

cd ..

SVG="public/icon.svg"
OUT="resources"

# Prüfen ob Inkscape installiert ist
if ! command -v inkscape &>/dev/null; then
  echo "❌ Inkscape nicht gefunden. Installieren mit: sudo dnf install inkscape"
  exit 1
fi

mkdir -p "$OUT"

echo "🎨 Generiere Icons aus $SVG ..."

# @capacitor/assets Eingabedateien
inkscape "$SVG" --export-filename="$OUT/icon.png"              --export-width=1024 --export-height=1024
inkscape "$SVG" --export-filename="$OUT/icon-foreground.png"   --export-width=1024 --export-height=1024
inkscape "$SVG" --export-filename="$OUT/icon-background.png"   --export-width=1024 --export-height=1024

echo "✅ PNGs erzeugt in $OUT/"
echo ""
echo "🚀 Starte @capacitor/assets ..."
yarn capacitor-assets generate --android --ios

echo "✅ Fertig! Icons wurden in android/ und ios/ geschrieben."
