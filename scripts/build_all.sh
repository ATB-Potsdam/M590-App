#!/bin/bash

dir="$( dirname "$0" )"

venvDir="$dir/.venv"

test -d "$venvDir" || python -m venv "$venvDir"

source "$venvDir/bin/activate"

pip install -r "$dir/requirements.txt"

period="1991-2020"
months="3-10"

python "$dir/build_raster.py" --type precip --period "$period" --months "$months"
python "$dir/build_raster.py" --type et0    --period "$period" --months "$months"
