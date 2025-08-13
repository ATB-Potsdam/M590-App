#!/bin/bash

cd rust
# cargo clean
cargo build --release
cd polygon_query_test

# Compile the C test program
cc test_polylookup.c -L ../target/release -lpolylookup -Wl,-rpath=$(pwd)/../target/release -o test_polylookup

for test in "13.4178058 52.5167835 -252" "9.7122609 53.3178489 -125" "12.1246426 53.1517263 -204" "9.0993541 53.6832796 -82" "8.9982722 53.9532901 -48"
do
    params=($test)

    echo "Running test with parameters: ${params[0]} ${params[1]} KWB should be: ${params[2]}"

    # Test the polygon lookup with a sample file
    echo "Running Python test..."    
    python3 test_polylookup.py ../../data/Klimaräume.fgb ${params[0]} ${params[1]}

    # Run the C test program
    echo "Running C test..."
    ./test_polylookup ../../data/Klimaräume.fgb ${params[0]} ${params[1]}

    echo "-------------------------------------------"
done

echo "All tests completed."