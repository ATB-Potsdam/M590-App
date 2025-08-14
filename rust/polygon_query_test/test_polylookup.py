#!/usr/bin/env python3
import ctypes
import os
import sys

# usage: python3 test_polylookup.py path/to/layer.fgb 7.0 50.0
if len(sys.argv) != 4:
    print("usage: python3 test_polylookup.py <layer.fgb> <lon> <lat>")
    sys.exit(2)

lib_path = os.path.abspath("../target/release/libpolylookup.so")
layer_path = sys.argv[1].encode("utf-8")
lon = float(sys.argv[2])
lat = float(sys.argv[3])

lib = ctypes.CDLL(lib_path)
lib.load_layer.argtypes = [ctypes.c_char_p]
lib.load_layer.restype = ctypes.c_int
lib.query_point_json.argtypes = [ctypes.c_double, ctypes.c_double]
lib.query_point_json.restype = ctypes.c_void_p
lib.free_cstring.argtypes = [ctypes.c_void_p]
lib.free_cstring.restype = None

rc = lib.load_layer(layer_path)
if rc != 0:
    print("load_layer failed")
    sys.exit(1)

ptr = lib.query_point_json(lon, lat)
s = ctypes.string_at(ptr).decode("utf-8")
lib.free_cstring(ptr)

print("raw json:", s)
# try:
#    print("parsed:", json.dumps(json.loads(s), indent=2, ensure_ascii=False))
# except Exception:
#    pass
