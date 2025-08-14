#!/bin/bash

cd rust
if false; then
    cargo clean
    cargo build --release

    # Ensure the wasm32 target is added and wasm-pack is installed
    # yay rustup; rustup default stable
    rustup target add wasm32-unknown-unknown
    export PATH="$HOME/.cargo/bin:$PATH"
    cargo install wasm-pack
    wasm-pack build --release --target web

    cp -r ./pkg ../web/
    cp -r ./pkg ../app/public/
fi

cd polygon_query_test

# Compile the C test program
cc test_polylookup.c -L ../target/release -lpolylookup -Wl,-rpath=$(pwd)/../target/release -o test_polylookup

for test in "13.4178058 52.5167835 -252" "9.7122609 53.3178489 -125" \
            "12.1246426 53.1517263 -204" "9.0993541 53.6832796 -82" \
            "8.9982722 53.9532901 -48" "7.3289732 51.2156759 1" \
            "7.4053921 51.2062917 71" "12.7623675 50.915663 -166"

do
    params=($test)

    echo "Running test with parameters: ${params[0]} ${params[1]} KWB should be: ${params[2]}"

    # Test the polygon lookup with a sample file
    echo -n "Running Python test..."
    python3 test_polylookup.py ../../data/Klimaräume.fgb ${params[0]} ${params[1]} | grep 'raw json: ' | grep -qe ",\"kwb\":${params[2]}\\b" && echo "SUCCESS!" || echo "FAILED!"

    # Run the C test program
    echo -n "Running C test..."
    ./test_polylookup ../../data/Klimaräume.fgb ${params[0]} ${params[1]} | grep 'matches: ' | grep -qe ",\"kwb\":${params[2]}\\b" && echo "SUCCESS!" || echo "FAILED!"

    echo "-------------------------------------------"
done

echo "All tests completed."

