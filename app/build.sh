#!/bin/bash

# build web assets
npm run build

# copy web assets into native projects
npx cap copy
npx cap sync

export CAPACITOR_ANDROID_STUDIO_PATH="/var/usr/opt/android-studio/bin/studio.sh"

# open platforms in IDEs
npx cap open android   # Android Studio
#npx cap open ios       # Xcode (on macOS)
