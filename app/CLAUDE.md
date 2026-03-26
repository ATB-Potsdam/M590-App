# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

M590 DWA App — a German agricultural irrigation advisory tool (DWA = Deutsche Vereinigung für Wasserwirtschaft). It calculates irrigation water demand for farms based on climate data, soil properties, and crop types. Built as a hybrid web/mobile app.

## Commands

- `yarn dev` — start Vite dev server with HMR
- `yarn build` — TypeScript check + Vite production build
- `yarn lint` — ESLint on `src/`
- `yarn build:android` — build + sync + open in Android Studio
- `yarn build:ios` — build + sync + open in Xcode

Package manager is **Yarn 4** (Corepack). Do not use npm.

## Architecture

**Stack:** React 19, TypeScript, Vite, Zustand, Capacitor (Android/iOS), SCSS, react-router v7, Leaflet maps.

### State Management (Zustand)

Two stores, both using `subscribeWithSelector`:

- **`useAppStore`** — runtime-only state: loaded WASM layer, raster lookups (precipitation/ET0), toast messages. Not persisted.
- **`useLocalStore`** — localStorage-backed state using a `ValueSetter<T>` pattern (`[value, setter]` tuples). Holds `dwa_farm` (Farm) and `dwa_projects` (Project[]). Each key auto-syncs to localStorage on write.

### Domain Model

- **Farm** → has **Fields** (with GPS location, soil class `nFkweClass`, climate zone)
- **Project** → has **FieldAssignments** (links a field to a crop module, plant, irrigation period, surcharges)
- **Modules** (`ModuleType`): `hauptkulturen`, `gemuese_obst`, `weinbau`, `gruenflaechen`, etc. — each has its own calculation logic in `src/lib/calculations/`

### Geo/Climate Data Pipeline

1. **Climate zones**: A WASM module (`src/pkg/polylookup`) loads a FlatGeobuf file (`public/data/Klimaraeume.fgb`) and does point-in-polygon lookups to classify fields into climate zones (A–H).
2. **Raster data**: Binary raster files (`public/data/*.bin` + `.meta.json`) provide monthly precipitation and ET0 values. Coordinates are reprojected from WGS84 to the raster's CRS (EPSG:31467/25832) via proj4. Lookup is synchronous after initial load.
3. On app start, both data sources are loaded in parallel. Fields missing climate data get backfilled via `refreshClimateData`.

### Routing

```
/         → HomePage (or redirect to /farm if no farm data)
/farm     → FarmPage (manage farm name + fields)
/projects → ProjectsPage (list projects)
/projects/:id → ProjectDetailPage
/projects/:id/assignment/:assignmentId → AssignmentPage
```

### Language

Domain terminology and code comments are in **German** (agricultural/hydrological terms). UI text is German. Variable names and code structure use English.

## Key Conventions

- `VITE_BASE_PATH` env var controls the app's base URL path (for subdirectory deployment).
- The `copyToTesla.sh` and `build.sh` scripts are deployment helpers, not part of the standard dev workflow.
- Plant data is defined as raw constants in `src/constants/plantDataRaw.ts` with typed name enums in `plantNames.ts`.
- Soil constants (nFKWe classes) are in `src/constants/soilConstants.ts`.
