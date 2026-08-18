#!/bin/bash

dir="$( dirname "$0" )"

venvDir="$dir/.venv"

test -d "$venvDir" || python -m venv "$venvDir"

source "$venvDir/bin/activate"

pip install -r "$dir/requirements.txt"

period="1991-2020"

# Both rasters come from the products M 590 Kapitel 4.2.3 names -- HYRAS for
# precipitation, FAO-56 grass reference for ET0 -- via build_raster_nc.py.
# build_raster.py is kept for the older multi_annual ASCII grids, but its output
# is NOT what the app ships: multi_annual/evapo_p is AMBAV/Haude, a different
# evaporation model, and using it makes the KWB correction non-conformant.

# Precipitation must cover the full year: the sport/green modules (naturrasen,
# golf, tennen, weinbau) classify sites by ANNUAL precipitation. A Mar-Oct raster
# makes that sum roughly 150-350 mm too low, pushing sites into a lower
# precipitation class and overstating their demand.
python "$dir/build_raster_nc.py" --type precip_hyras --period "$period" --months 1-12

# ET0 is only used for the monthly KWB correction over a crop's irrigation
# period (gemuese_obst) and is never summed annually, so Mar-Oct is sufficient.
# This one streams ~12 GB of daily NetCDF; pass --cache-dir to put it on a
# roomier disk, and --keep-cache to avoid re-downloading on a rebuild.
python "$dir/build_raster_nc.py" --type et0_fao      --period "$period" --months 3-10
