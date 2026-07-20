# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

M 590 DWA App — a German agricultural irrigation advisory tool (DWA = Deutsche Vereinigung für Wasserwirtschaft). It calculates irrigation water demand for farms based on climate data, soil properties, and crop types per DWA-M 590 standard. Built as a hybrid web/mobile app.

## Git

- Do **not** add `Co-Authored-By` lines to commit messages.
- Always run `yarn lint` (and fix any issues) before committing.

## Local environment

- **Never kill a running Chromium / browser instance (Vivaldi, Chrome, etc.) to debug or automate — always ask first.** The user has other scripts that rely on a persistent browser instance (e.g. a remote-debugging port); closing it breaks them. When you need a browser for UI/tour verification, launch your **own** headless instance on a **separate** port and close only that one. Leave anything you did not start alone.

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

**Future idea — module-first quick-start (onboarding):** Tester feedback (2026-07-18) said the entry is unintuitive: the app forces the farm→field→project→assignment sequence before any result, which is ag-framed and confusing for e.g. golf-course planners. Idea: on first entry let the user pick a use-case (Golf / Landwirtschaft / Sportplatz …) and route them straight to the minimal inputs for that path, hiding irrelevant steps; keep the current flow as fallback. This is the real fix for the "holpriger Einstieg" but reshapes routing/entry, so it was deferred pending user confirmation. Interim mitigations already shipped: `InfoHint` popovers, `AssignmentSteps` progress header, a loadable demo project, and a **guided walk-through** (`components/tour/`, offered after the demo loads) that leads once through all pages (see below).

### Onboarding helpers

- `components/InfoHint.tsx` — reusable "Warum fragen wir das?" collapsible (`<details>`, no tooltip lib). Use for contextual explanations; place near the control it explains.
- `components/AssignmentSteps.tsx` — macro-phase progress header on AssignmentPage (Nutzung → Details → Ergebnis), derived from `module`/`result` state. Informational, not clickable.
- `lib/demoData.ts` — `seedDemoData(setFarm, setProjects, precip, et0)` **replaces** farm + projects with a demo (Kartoffel-Acker + Golfplatz + one scenario) and enriches climate class/data inline (the App climate effects don't re-fire after seeding). Replacing (not appending) means repeated loads don't duplicate. The demo project is tagged `Project.isDemo`. Triggered from two places: the welcome dialog (`OnboardingOverlay`, only when no farm) and a "🎬 Beispiel laden" button on FarmPage (with confirm, since it overwrites). After the FarmPage load it scrolls to top so the hint is visible.
- `components/DemoHint.tsx` — short "👋 Beispieldaten" note shown while a demo project exists (`project.isDemo`). Collapsible `<details>` (not dismissible). Two variants (`variant="farm"` / `variant="project"`) that differ only in one intro line; both keep the "Beispiel löschen" link that jumps to the FarmPage "Alle Daten löschen" block (`id="farm-reset"`) — deleting the demo means clearing all data, since the demo is the only data. **The actual step-by-step walk-through lives in `components/tour/`, not here** — DemoHint was trimmed to just the "these are demo data / delete them" note once the tour existed.
- `components/tour/` — **guided walk-through** (Rundgang) across pages, in **two variants** (`tourVariant: "demo" | "empty"`) with **different step models**:
    - **demo** (Beispieldaten geladen) — **linear**, index-driven (`tourStep`). `demoSteps: TourStep[]` (Flächen → Flächen anlegen/bearbeiten → Szenarien-Tab → Szenario öffnen → Zuweisung → **Zuweisung öffnen (Ergebnis auf der Zuweisungs-Seite)** → Zusammenfassung); each step has `advanceOn: "route" | "button"` (URL match, or **Weiter/Fertig**). Fixed demo data is always complete, so linear is fine. Uses the shared `fieldStep("button")`. **`open-assignment` is `advanceOn:"route"`** — der Anwender klickt die Zuweisungszeile, der Rundgang folgt auf die (tiefere) Zuweisungs-Seite; da der Rundgang die Assignment-ID nicht kennt, erkennt der Demo-Advance-Effekt in `TourOverlay` diesen Schritt per **Präfix** (`/projects/:id/assignment/`) statt exaktem Pfadvergleich. Der Folgeschritt **`assignment-detail`** hat die *Elternroute* `/projects/:id` (damit die Auto-Navigation den Anwender auf der tieferen Seite in Ruhe lässt), sein Spotlight zielt aber auf `data-tour="assignment-result"` (Ergebnis-`<section>` der `AssignmentPage`, nur gerendert wenn `result` existiert). **Weiter** auf `assignment-detail` führt zu `summary` (`/projects/:id`, terminal) — der terminale Schritt darf laut Auto-Nav-Ausnahme auch aus einer Unterseite hoch navigieren, holt den Anwender also zur Übersicht zurück. (Früher war `open-assignment` `advanceOn:"button"`: klickte der Anwender die Zeile trotzdem, blieb der Rundgang mit veraltetem Spotlight auf der Zuweisungs-Seite hängen — das war der Bug.)
    - **empty** (no data / guided creation) — **state-driven**, NOT an index. `emptySteps: EmptyStep[]`; each step has a `done(ctx)` predicate (`ctx = {farm, projects, demoProjectId, pathname}`) and `currentEmptyStep(ctx)` returns the **first step not yet done** = the real next action. Flow: Betrieb benennen → Fläche anlegen → Szenarien-Tab → Szenario anlegen → Fläche zuweisen → Nutzung festlegen (open assignment) → Nutzung wählen & speichern → Zusammenfassung (`terminal`, **Fertig**). Because it's derived from state, **restarting the tour any time (from the ❓/OnboardingOverlay) always shows the correct next step** for whatever already exists — this was the whole point. No "weitere …?" loop steps (they had no state signal and fought restart-correctness); "you can add several" is folded into the step copy instead. **Store-vs-local caveat:** on the AssignmentPage the module is local state until *saved*, so `hasAssignedModule` (→ `configure-assignment`) only flips on save — that step targets the **`module-picker`** section (present from the moment the AssignmentPage opens, unlike the save button which only appears after a module is chosen); the preceding `open-usage` step targets `assignment-row` and is done once the AssignmentPage route is open. **Nav must not fight deeper navigation:** the auto-navigate effect skips when the user is on a *descendant* of the step route (`here.startsWith(route + "/")`) — otherwise opening a Zuweisung (deeper than the step's `/projects/:id` route) would be instantly yanked back, making "Nutzung wählen" appear dead. Project-scoped routes/targets resolve via `currentProjectId(ctx)` (first non-demo project).
  `useTourTarget.ts` resolves `[data-tour="…"]`, **rAF-polls until the element exists AND has a non-zero rect** (after a route change React may match a not-yet-laid-out node → 0×0 at origin), scrolls it into view, and **re-queries the element on every `measure()`** (React can replace the node on re-render; a cached detached node returns 0×0 — this was a real spotlight-stuck-at-origin bug), ignoring 0×0 rects. `TourOverlay.tsx` computes a normalized `active` step (state-driven for empty via `currentEmptyStep`, index for demo), navigates to `active.route` if the user is elsewhere (via `closeOverlayForTour` on start, which skips the onboarding `history.back()` that would otherwise bounce the nav), renders a box-shadow "spotlight" (target stays clickable — dimmer is `pointer-events:none`) plus a `@floating-ui/react` tooltip with **`strategy:"fixed"`** (virtual ref uses viewport coords; the default `absolute` mis-positioned it). Runtime state (`tourActive`/`tourVariant`/`tourStep`/`tourSuspended` + `startTour(variant)`/`nextTourStep`/`suspendTour`/`endTour`) lives in `useAppStore`; the persisted `dwa_tour_completed` (`useLocalStore`) gates the demo offer. Targets carry `data-tour="farm-name|farm-fields|add-field|nav-scenarios|project-row|add-scenario|assignment-row|add-assignment|module-picker|assignment-result|project-summary"`. Add-controls that toggle to a form (`add-field`, `add-scenario`, `add-assignment`) put the `data-tour` on a **persistent wrapper** around button+form so the spotlight tracks while the form is open.
  **Suspend/resume:** Überspringen/Escape call `suspendTour()` (not finish) → a floating `TourResumeButton` ("🧭 Rundgang fortsetzen", with × to end) appears (`tourSuspended && !tourActive`); resuming calls **`resumeTour()`** which only flips `tourActive` back on and **keeps `tourStep`** — the demo/orientation tour is index-based and `startTour` would reset it to 0 (that was a "resume restarts from the beginning" bug). The empty tour is state-driven, so it picks up at the right step regardless. Only reaching **Fertig** sets `dwa_tour_completed`. **Route resolution:** the linear tour resolves its `/projects/:id` routes via `tourPid = currentProjectId(ctx) ?? demoProjectId` (in `TourOverlay`), NOT hard `demoProjectId` — otherwise the "Kurzeinführung" on own data (no demo) would resolve routes to `/projects/` and never advance. **Auto-nav guard:** the "user already deeper → leave alone" check uses `route === "/" ? "/" : route + "/"`; without the `/`-special-case, `"/" + "/"` = `"//"` never matched, so clicking a scenario from the `open-project` step (route `/`) was instantly yanked back to `/` (flicker, step stuck).
  **Entry points:** a global floating `TourStartButton` ("🧭 Rundgang durch die Beispieldaten", dismissable ×) appears on any page while a demo project exists and the tour is neither active/suspended/completed (`hasDemo && !tourCompleted && !tourActive && !tourSuspended`); its × sets `dwa_tour_completed`. The `OnboardingOverlay` (?-dialog) button picks one of **three modes** in order: **demo** (a demo project exists) → linear demo tour; **empty** (own data still incomplete, `!allEmptyStepsDone`) → guided setup; **orientation** (own data complete AND `isTourWalkable` — the tour's `currentProjectId` has ≥1 assignment whose field exists) → the **same linear tour as demo** (`tourVariant:"demo"`) offered as a neutral **"Kurzeinführung"** to refresh where the important places are. If data is complete but NOT walkable (no clickable assignment row), no button is shown — the FAQ carries the user instead. The demo tour's step copy is neutral (no "Beispiel"-specific wording except the label), so it serves both demo and own-data runs. `OnboardingBanner` hides itself while `tourActive`. (The old FarmPage "🧭 Rundgang starten?" offer was replaced by the floating button.)

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
