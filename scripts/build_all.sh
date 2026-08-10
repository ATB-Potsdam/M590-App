#!/bin/bash

dir="$( dirname "$0" )"

venvDir="$dir/.venv"

test -d "$venvDir" || python -m venv "$venvDir"

source "$venvDir/bin/activate"

pip install -r "$dir/requirements.txt"

period="1991-2020"

# Precipitation must cover the full year: the sport/green modules (naturrasen,
# golf, tennen, weinbau) classify sites by ANNUAL precipitation. A Mar-Oct raster
# makes that sum roughly 150-350 mm too low, pushing sites into a lower
# precipitation class and overstating their demand.
python "$dir/build_raster.py" --type precip --period "$period" --months 1-12

# ET0 is only used for the monthly KWB correction over a crop's irrigation
# period (gemuese_obst) and is never summed annually, so Mar-Oct is sufficient.
python "$dir/build_raster.py" --type et0    --period "$period" --months 3-10
