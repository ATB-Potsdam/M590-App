# Tasks

## Modules

- [x] **1. Weinbau (viticulture)**
  Create calculation module per Funktionsweise3.0.md (Kap. 4.3.5, Tables 26/27):
  - `src/lib/calculations/weinbau.ts`: lookup by nFKWe group + annual precipitation class (<500 / 500–700 / 700–900 mm)
  - Table 26: standard lookup (single value mm/a)
  - Table 27: scenario (normal/dry) ONLY for ~550mm (500–600mm) sites (Geisenheim)
  - Junganlage/Neupflanzung: auto-set nFKWe to 1–2
  - Result component `src/components/results/WeinbauResult.tsx`
  - Wire into `getAssignmentResult.ts`
  - UI inputs in AssignmentPage (Junganlage toggle, nFKWe confirmation)
  - Hint when precipitation outside 500–600mm: no scenario-specific values

- [x] **2. Gruenflächen (green spaces / FLL factors)**
  Create module per Funktionsweise3.0.md (Kap. 4.4.2):
  - `src/lib/calculations/gruenflaechen.ts`: ETt = ET₀ × L × G × B × S
  - Factor G: vegetation (Rasen/Bodendecker, Stauden, Grosssträucher/Bäume)
  - Factor L: site moisture (trocken, frisch, feucht) — suggest from nFK
  - Factor B: soil type (Sand, sandiger Lehm, Lehm/Schluff/Ton) — suggest from soil data
  - Factor S: sun exposure (Schatten, Halbschatten, volle Sonne)
  - Output: mm/d, mm/period, m³/period
  - Custom vegetation period (default April–September, 183 days)
  - All inputs required (Todo.md)
  - No surcharges, no scenarios
  - Result component + dispatcher wiring

- [x] **3. Naturrasensportplätze (natural turf sports)**
  Create module per Funktionsweise3.0.md (Kap. 4.4.3, Table 33):
  - `src/lib/calculations/naturrasen.ts`: precipitation class → Table 33 (range min–max)
  - No additional user inputs beyond field/location
  - Block 4: alternative water sources (type + m³/a deducted)
  - Result component + dispatcher wiring

- [x] **4. Golfplätze (golf courses)**
  Create module per Funktionsweise3.0.md (Kap. 4.4.4, Tables 34/35):
  - `src/lib/calculations/golf.ts`
  - Sub-areas: Grüns/Vorgrüns, Abschläge/Tees, Spielbahnen/Fairways
  - User choice: manual sub-area entry OR standard templates (18-hole / Spielbahn from Table 35)
  - Precipitation class → Table 34 values per sub-area
  - Sum sub-areas for total m³/a
  - Block 4: alternative water sources
  - Result component + dispatcher wiring

- [x] **5. Kunststoffrasenflächen (synthetic turf)**
  Create module per Funktionsweise3.0.md (Kap. 4.4.5):
  - `src/lib/calculations/kunstrasen.ts`: weekly model
  - Inputs: area (m²), weeks/season (15–20 typical), intensity mm/week (15–50, 5mm steps)
  - m³/a = (weeks × mm/week × area) / 1000
  - Block 4: alternative water sources
  - Result component + dispatcher wiring

- [x] **6. Tennenflächen (clay courts)**
  Create module per Funktionsweise3.0.md (Kap. 4.4.5, Table 36):
  - `src/lib/calculations/tennen.ts`: precipitation class → Table 36 (range or ">=X")
  - No additional user inputs beyond field/location
  - Block 4: alternative water sources
  - Result component + dispatcher wiring

## Features

- [ ] **7. Projektzusammenfassung (project summary) with details**
  Enhance ProjectDetailPage.tsx:
  - Detailed summary per field assignment: field name, crop/module, area → mm/a + m³/a
  - Both scenarios side by side where applicable
  - Subtotals per field, grand total for project
  - Alternative water source deductions (sport/green modules)
  - Net application amount (Netto-Antragsmenge)

- [ ] **8. Handle missing table values: hide or show alternative display**
  From Todo.md:
  - Hide result card when calculation yields null/no values
  - Optionally show info: "Leere Felder bedeuten fehlende Literaturwerte, nicht: 'kein Bedarf'"
  - Apply to all modules (especially Hauptkulturen and Gemüse/Obst)
