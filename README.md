# DWA-App (M 590)

Irrigation water demand calculator for agricultural fields following
[DWA-M 590](https://www.dwa.de) (Deutsche Vereinigung für Wasserwirtschaft,
Abwasser und Abfall e.V.). Computes per-field water demand from climate data,
soil properties (nFKWe class), and crop or land-use type.

Live: https://dwa.runlevel3.de

## Repository layout

```
app/         React/TypeScript front-end (Vite, Capacitor wrapper for Android/iOS)
rust/        WebAssembly polygon lookup (FlatGeobuf + point-in-polygon)
scripts/    Build/deploy helpers
data/        Source FlatGeobuf + raster inputs
web/         Static demo of the WASM polygon lookup
images/      App icons and marketing assets
```

The app itself lives in `app/`. See `app/CLAUDE.md` for the project's
internal architecture notes.

## Development

```bash
cd app
yarn install
yarn dev        # Vite dev server with HMR
yarn build      # Production build
yarn lint       # ESLint
```

Mobile builds:

```bash
yarn build:android   # build + sync + open Android Studio
yarn build:ios       # build + sync + open Xcode
```

Yarn 4 (Corepack) is required — do not use npm.

## License

This project is licensed under the [Apache License 2.0](LICENSE).

## Citation

If you use this software in academic work, please cite it using the metadata
in [CITATION.cff](CITATION.cff). GitHub renders a "Cite this repository"
button on the repo page based on that file.

## Authors

- Stephan Hantigk, [runlevel3 GmbH](https://www.runlevel3.de)
- [Leibniz-Institut für Agrartechnik und Bioökonomie e.V. (ATB)](https://www.atb-potsdam.de)
