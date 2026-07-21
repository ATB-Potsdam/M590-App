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

- [x] **7. Projektzusammenfassung (project summary) with details**
      Enhance ProjectDetailPage.tsx:
    - Detailed summary per field assignment: field name, crop/module, area → mm/a + m³/a
    - Both scenarios side by side where applicable
    - Subtotals per field, grand total for project
    - Alternative water source deductions (sport/green modules)
    - Net application amount (Netto-Antragsmenge)

- [x] **8. Handle missing table values: hide or show alternative display**
      From Todo.md:
    - Hide result card when calculation yields null/no values
    - Optionally show info: "Empty fields mean missing literature values, not: 'no demand'"
    - Apply to all modules (especially Hauptkulturen and Gemüse/Obst)

- [x] **9. AssignmentPage.tsx**
      When selecting "Obst/Gemüse" (fruit/vegetables)
    - "Save assignment" is enabled even before a time span is selected
    - After selecting "Obst/Gemüse" the screen should jump to the fruit selection

- [x] **10. Export project calculations to PDF or printer**

- [x] **11. Export/import farm and project settings**

- [x] **12. When deleting a field it should be removed from all projects too**

- [x] **13. Fix PDF export to match description**
    - [x] The ATB-Logo in the top left corner is wrongly scaled
    - [x] Make the contents match the description in 'todo/PlaystoreText.txt'
          "Der Datenexport enthält alle für Genehmigungsverfahren relevanten Informationen: Standortkoordinaten, Klimaparameter, Tabellenwerte, Korrekturfaktoren, Zuschläge und Ergebnisse – vollständig nachvollziehbar und dokumentiert."
    - [x] Add all the data for every field (location, size, climate zone, nFKWe class, selected crop and optional settings) and list all referenced tables and it's sources. If possible make the sources names (like "Merkblatt M 590") constants for later fixups.

- [x] **14. Try to split the built packages to optimize loading**
      There is a warning "Some chunks are larger than 500 kB after minification."
      Try to not exceed this limit too much!

## Backlog / Deferred

- [ ] **Major dependency upgrades (react-router 8, vite 8).** Deferred — no
      security benefit (current deps are audit-clean after the 2026-07-21
      in-major security patches), and both majors are blocked by the Node
      runtime. Treat as a deliberate "Node 22 + toolchain" maintenance window,
      not a security fix.

      **Hard blocker — Node runtime:** we run **Node 21.7.1**.
    - react-router 8 requires `node >=22.22.0`.
    - vite 8 requires `node ^20.19 || >=22.12` (Node 21 satisfies neither).
    - → Upgrade Node to **22.x LTS** across dev/CI/deploy first.

      **react-router 7 → 8** — low code risk:
    - App uses only the declarative API (`BrowserRouter`, `Routes`/`Route`/
      `Link`, `useNavigate`/`useParams`/`useLocation`/`useSearchParams`); RR8's
      breaking changes target the data-router (`createBrowserRouter`, loaders/
      actions), which we do **not** use.
    - Peer bump: `react`/`react-dom` to `>=19.2.7` (currently 19.2.4).

      **vite 7 → 8** — low–moderate code risk:
    - Must bump together: `@vitejs/plugin-react` 5 → **6** (its v6 peers
      `vite ^8`), and `vite-plugin-pwa` 1.2 → 1.3 (already supports vite 8).
    - vite 8 defaults to the **Rolldown** bundler. `vite.config.ts` uses stable
      APIs (`defineConfig`, `loadEnv`, Rollup `generateBundle`/`emitFile` in the
      `seoPlugin`) — expected to work, but re-verify: SEO robots.txt/sitemap
      output, PWA service worker, chunk splitting, and all routes.

      **Order:** Node 22 → react/react-dom → vite+plugin-react+pwa → react-router
      → full build + smoke test.
