# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

M 590 DWA App — a German agricultural irrigation advisory tool (DWA = Deutsche Vereinigung für Wasserwirtschaft). It calculates irrigation water demand for farms based on climate data, soil properties, and crop types per DWA-M 590 standard. Built as a hybrid web/mobile app.

## Git

- Do **not** add `Co-Authored-By` lines to commit messages.
- Always run `yarn lint` (and fix any issues) before committing.

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

- **Farm** → has **Fields** (GPS location, soil class `nFkweClass`, climate zone, monthly climate data)
- **Project** → has **FieldAssignments** (links a field to a calculation module + module-specific inputs)
- **Modules** (`ModuleType`): 8 types, each with its own calculation in `src/lib/calculations/`

### Routing

```
/         → ProjectsPage (list projects with water totals; redirect to /farm if no farm data)
/farm     → FarmPage (manage farm name + fields)
/projects/:id → ProjectDetailPage (assignments + summary table)
/projects/:id/assignment/:assignmentId → AssignmentPage (configure assignment)
```

**Future idea — Dashboard page:** A cross-project overview could be added later at `/` (moving projects to `/projects`). Potential content: aggregated water demand across all projects (normal + dry totals), assignment completeness status, per-field summary across projects, nFKWe class distribution. Icon: 🌾.

**Future idea — module-first quick-start (onboarding):** Tester feedback (2026-07-18) said the entry is unintuitive: the app forces the farm→field→project→assignment sequence before any result, which is ag-framed and confusing for e.g. golf-course planners. Idea: on first entry let the user pick a use-case (Golf / Landwirtschaft / Sportplatz …) and route them straight to the minimal inputs for that path, hiding irrelevant steps; keep the current flow as fallback. This is the real fix for the "holpriger Einstieg" but reshapes routing/entry, so it was deferred pending user confirmation. Interim mitigations already shipped: `InfoHint` popovers, `AssignmentSteps` progress header, and a loadable demo project (see below).

### Onboarding helpers

- `components/InfoHint.tsx` — reusable "Warum fragen wir das?" collapsible (`<details>`, no tooltip lib). Use for contextual explanations; place near the control it explains.
- `components/AssignmentSteps.tsx` — macro-phase progress header on AssignmentPage (Nutzung → Details → Ergebnis), derived from `module`/`result` state. Informational, not clickable.
- `lib/demoData.ts` — `seedDemoData(setFarm, setProjects, precip, et0)` seeds a demo farm (Kartoffel-Acker + Golfplatz) + demo project and enriches climate class/data inline (the App climate effects don't re-fire after seeding). Only offered when no farm exists (`OnboardingOverlay`). Demo records are normal + user-deletable.

### Language

Domain terminology and code comments are in **German** (agricultural/hydrological terms). UI text is German. Variable names and code structure use English.

---

## Modules

Eight `ModuleType` values, each implemented as `src/lib/calculations/<module>.ts`:

| Module | File | Method | Scenarios | Alt. Water |
|---|---|---|---|---|
| `hauptkulturen` | `hauptkulturen.ts` | Table lookup (KWBv zone × crop × nFKWe) | normal + dry | — |
| `gemuese_obst` | `gemueseObst.ts` | Potsdam reference KWB correction | normal + dry | — |
| `weinbau` | `weinbau.ts` | Table 26/27 (precipitation class × nFKWe) | normal + dry (550 mm sites only) | — |
| `gruenflaechen` | `gruenflaechen.ts` | FLL: ET₀ × L × G × B × S | normal only | yes |
| `naturrasen` | `naturrasen.ts` | Table 33 (precipitation class) | normal only | yes |
| `golf` | `golf.ts` | Table 34 per sub-area (greens/tees/fairways) | normal only | yes |
| `kunstrasen` | `kunstrasen.ts` | weeks × mm/week × area | normal only | yes |
| `tennen` | `tennen.ts` | Table 36 (precipitation class) | normal only | yes |

Modules marked **Alt. Water** support `altWasserM3` deduction (alternative water sources → Netto-Antragsmenge).

### Calculation Pattern

Every module exports:
- `<Module>Input` interface
- `<Module>Result` interface — always includes `totalRangeMm: Range` and `totalRangeM3: Range`
- `calculate<Module>()` — single scenario
- `calculate<Module>Both()` — returns `{normal, dry}` (dual-scenario modules only)

`hauptkulturen` and `gemuese_obst` also export `hasValue: boolean` on their result — `false` when the lookup table has no literature value for that combination (not the same as "no irrigation needed"). The other modules always produce valid values.

### Dispatch

`src/lib/calculations/getAssignmentResult.ts` — central dispatcher:
- `getAssignmentResult(fa, field): AssignmentResult | null` — validates required inputs, calls the right module, returns `{normal?, dry?, altWasserM3?}` or `null` if data is incomplete
- `sumResults(results[]): {normalMm, normalM3, dryMm, dryM3, totalAltWasserM3, nettoM3}` — aggregates ranges across assignments; skips results where `hasValue === false`
- `getMissingData(fa, field): string[]` — lists what's still missing for a calculation

`AssignmentResult`:
```ts
{
  normal?: <any result type>;
  dry?: <any result type>;
  altWasserM3?: number;  // only for sport/green modules
}
```

---

## Data Types

**`src/types/dataTypes.ts`:**
- `Range = [min: number, max: number]`
- `NFkweClassName = "1-2" | "3a" | "3b" | "4" | "5"`
- `KwbZone = "A" | "B" | ... | "H"` (climate water balance zones)
- `MonthValueType = [jan, feb, ..., dec]` (12 monthly values, `number | null`)
- `RawData = [norm: [Range|null, Range|null, Range|null, Range|null], dry: [...], time: Range[]]` — raw plant data structure (4 nFKWe classes: 1-2, 3a/3b combined, 4, 5)
- `AnyPlantName` — union of all plant name types

**`src/types/project.ts` — `FieldAssignment`:**
```ts
{
  id, fieldId, module?,
  // Crop modules
  plantCategory?, plantKey?, irrigationPeriod?,
  // Surcharges (hauptkulturen/gemuese_obst only)
  surchargeIntermediate: boolean,  // +10 mm (Zwischenfrucht)
  surchargeEmergence: number,      // 0–20 mm (Auflaufbewässerung)
  surchargeHeavySoil: number,      // 0–20 mm, Kartoffeln only — reset when crop changes
  isTablePotato?: boolean,         // Speisekartoffeln — gates the +20 mm auto-surcharge (Kartoffeln). undefined = true (old projects keep the surcharge)
  isSummerCereal?: boolean,        // Sommergetreide flag for "sonst. Getreide" — unlocks the optional surcharges. undefined = false
  // Weinbau
  isJunganlage?: boolean,          // overrides nFKWe to class 1-2
  // Grünflächen FLL factors
  fllVegetation?, fllMoisture?, fllSoil?, fllSun?,
  fllPeriodStart?, fllPeriodEnd?,  // months 1-12, start ≤ end enforced in UI
  // Golf
  golfAreaMode?: "manual" | "18hole" | "spielbahn",
  golfGreensM2?, golfTeeM2?, golfFairwayM2?,
  // Kunstrasen
  kunstrasenWeeks?, kunstrasenMmPerWeek?,
  // Sport/Green modules
  altWasserM3?,                    // alternative water sources in m³/a
}
```

---

## Geo/Climate Data Pipeline

1. **Climate zones**: WASM module (`src/pkg/polylookup`) loads `public/data/Klimaraeume.fgb` (FlatGeobuf), does point-in-polygon to assign `KwbZone` (A–H) to each field. Used by hauptkulturen.
2. **Raster data**: Binary raster files (`public/data/*.bin` + `.meta.json`) provide monthly precipitation and ET0. Coordinates reprojected WGS84 → EPSG:31467/25832 via proj4. Used by gemuese_obst, weinbau, gruenflaechen, naturrasen, golf, tennen.
3. Both load on app start in parallel. `refreshClimateData()` backfills fields missing data.
4. Status flags on `Field`: `climateClassStatus` and `climateDataStatus` — both must be `"done"` before most calculations run.

**nFKWe mapping for raw data indices** (`src/lib/calculations/nFkweMapping.ts`):
- `"1-2"` → index 0, `"3a"/"3b"` → index 1, `"4"` → index 2, `"5"` → index 3

---

## Result Cards

`src/components/results/<Module>Result.tsx` — one per module, all share `ResultCard.scss`.

Common structure:
1. **Header**: field name, module label, area
2. **Block 1 – Ergebnis**: mm/a + m³/a ranges; if `hasValue === false` → amber warning box instead of numbers
3. **Block 2 – Berechnungsgrundlagen** (collapsible `<details>`): table reference, factors, precipitation class
4. **Block 3 – Zuschläge** (collapsible, only when > 0): auto + optional surcharge breakdown

CSS classes: `result-card__no-value` for missing-value warning, `result-card__hint` for contextual hints.

Dual-scenario cards (hauptkulturen, gemuese_obst, weinbau) receive both `result` (normal) and `dryResult` props.

---

## ProjectDetailPage Summary

The summary section in `ProjectDetailPage` shows:
- A collapsible `<details>` table: per-field breakdown (name, module, area, 🌤 normal mm/a+m³/a, ☀️ dry mm/a+m³/a, alt. water)
- Brutto totals (normal + dry)
- Alternative Wasserquellen deduction (if any)
- **Netto-Antragsmenge** = gross normal − totalAltWasserM3 (clamped to 0)

In the assignment list pills: `k. W.` shown instead of values when `hasValue === false`.

---

## Formatting

`src/lib/formatNum.ts`:
- `formatNum(value, decimals)` — locale-aware (`toLocaleString`), respects browser regional settings (comma vs. decimal point)
- `formatRange([min, max], unit)` — `"100–150 mm/a"` or `"123 mm/a"` when min === max

**Always use these — never `.toFixed()` for display.**

---

## Key Constants

- `src/constants/modules.ts` — `MODULES` array with `{type, icon, label}` + `getModuleLabel()`, `getModuleIcon()`
- `src/constants/plantDataRaw.ts` — raw crop/plant data arrays; `rawCropDataNorm`/`rawCropDataDry` for hauptkulturen; `RawData` format for gemuese_obst plants
- `src/constants/plantNames.ts` — typed name enums for all plant categories
- `src/constants/soilConstants.ts` — `nFkweClasses`, `additionWaterNormYear`, `additionWaterDryYear`, `refKwb` (Potsdam reference), `rFactor`

---

## Adding a New Module

1. Add the type to `ModuleType` in `src/types/project.ts`
2. Add module-specific fields to `FieldAssignment` (if any)
3. Create `src/lib/calculations/<module>.ts` with `Input`, `Result` (must include `totalRangeMm`, `totalRangeM3`), and `calculate<Module>()`
4. Add dispatch case in `getAssignmentResult.ts` (+ extend `AssignmentResult` union type)
5. Add missing-data check in `getMissingData()`
6. Create `src/components/results/<Module>Result.tsx`
7. Wire result card into `AssignmentPage.tsx` (state, calculation IIFE, result rendering, surcharge exclusion if applicable)
8. Add entry to `src/constants/modules.ts`

---

## Key Conventions

- `VITE_BASE_PATH` env var controls the app's base URL path (for subdirectory deployment).
- Spec document is in `doc/M 590 Vorlage Gelbdruck_neu.md` — the authoritative source for all table values and calculation methods.
- The `scripts/copyToTesla.sh` and `scripts/build.sh` scripts are deployment helpers, not part of the standard dev workflow.
- Open ranges (e.g. "> 250 mm/a") use `isOpenRange: boolean` + `max === null` in table definitions; display with `>` prefix.
- Precipitation classes shared across naturrasen/golf/tennen: `NaturrasenPrecipClass` from `naturrasen.ts`, helper `toNaturrasenPrecipClass()`.
- **No async/await**: Prefer `Promise.then()/catch()/finally()` chains over `async/await` syntax.
- **Merkblatt references use "Kapitel N", never "§ N"** — DWA-M 590 is a worksheet, not a statute. Match the spec's wording.
- **Crop surcharge rules** (`hauptkulturen.ts`): `cropAllowsOptionalSurcharge(crop, isSummerCereal)` decides whether Zwischenfrucht/Auflaufbewässerung apply. Winter crops (`Winterraps`, `Winterweizen`) never; `sonst. Getreide` only if `isSummerCereal`. The calc zeroes suppressed surcharges even if the UI leaks a stale value — keep this rule the single source, don't re-inline `&&` checks in components. The `Kartoffeln` +20 mm auto-surcharge is gated by `isTablePotato !== false`.
- **Field terminology** (`modules.ts` `fieldTerm(modules, plural?)`): pure sport/golf projects say "Fläche(n)", agricultural projects say "Feld/Felder". Derive from the project's assignment modules; used in `ProjectDetailPage` + `PdfSummaryTable`. Domain model keeps `Field`/`fieldId`/"Schlag" — this is UI labelling only.

---

## Styling

- **Design tokens**: All colors are CSS custom properties defined in `src/variables.scss` (`:root` block), grouped by category: text, backgrounds, borders, primary, accent, warning, error, chart, interactive. Always use `var(--color-*)` in SCSS — never hardcode hex/rgb values.
- **No inline styles**: All styling lives in `.scss` files. Do not use `style={{}}` in TSX. Only exception: dynamic computed values that depend on runtime data (e.g. bar heights in `ClimateBarChart`).
- **SCSS structure**: Each component has a co-located `.scss` file imported in the component's `.tsx`. Class naming follows BEM-like conventions (`component__element--modifier`).
