#include <stdio.h>
#include <stdlib.h>

extern int   load_layer(const char* path);
extern char* query_point_json(double lon, double lat);
extern void  free_cstring(char* ptr);

int main(int argc, char** argv) {
    if (argc != 4) {
        fprintf(stderr, "usage: %s <layer.fgb> <lon> <lat>\n", argv[0]);
        return 2;
    }
    const char* layer = argv[1];
    double lon = atof(argv[2]);
    double lat = atof(argv[3]);

    if (load_layer(layer) != 0) {
        fprintf(stderr, "load_layer failed for %s\n", layer);
        return 1;
    }
    char* json = query_point_json(lon, lat);
    printf("matches: %s\n", json);
    free_cstring(json);
    return 0;
}
