#!/bin/bash

# build web assets
yarn build

# copy web assets into native projects
yarn cap copy
yarn cap sync

export CAPACITOR_ANDROID_STUDIO_PATH="/var/usr/opt/android-studio/bin/studio.sh"

# open platforms in IDEs
yarn cap open android   # Android Studio
#yarn cap open ios       # Xcode (on macOS)
