# TODO

## About / Privacy pages — placeholders to confirm

Pages added in `app/src/pages/AboutPage.tsx` + `PrivacyPage.tsx`. Constants
centralized in `app/src/constants/contact.ts`. The following values are
**dummy data** and must be confirmed before publication:

### `app/src/constants/contact.ts`

- `CONTACT_EMAIL` — currently `info@runlevel3.de`. Confirm: which inbox should
  receive contact / privacy inquiries? Likely a dedicated address (e.g.
  `dwa-app@runlevel3.de` or an ATB address).
- `OPERATOR.name` / `OPERATOR.address` — placeholder ATB Potsdam address.
  Confirm legal data controller (Verantwortlicher i. S. d. Art. 4 Nr. 7 DSGVO).
  Is ATB the controller, or runlevel3 GmbH, or jointly? Full Impressum-grade
  postal address required.
- `DEVELOPER` — runlevel3 GmbH. Confirm legal name + URL.
- `COPYRIGHT.holder` — currently joint notice `runlevel3 GmbH / ATB`. Confirm
  IP ownership: work-for-hire with rights to ATB, runlevel3-retained, or
  truly joint? Adjust string accordingly (or split into two `©` lines).
- `COPYRIGHT.years` — start year `2025` is hard-coded; end year auto-updates
  at build time via `__BUILD_YEAR__` (vite define). Update start year if the
  notice should later cover an earlier or later starting point.

### `PrivacyPage.tsx`

- Verify the legal basis claim for OSM tile loading (Art. 6 Abs. 1 lit. f DSGVO).
- Confirm whether the app ever sends crash / telemetry data (currently assumed
  *no*). If a future build adds Sentry / analytics, this page must be updated.
- Decide whether a separate **Impressum** page is required (German TMG § 5 +
  DDG). About page currently mixes operator + developer info — may need to be
  split into Impressum + Über.
- Add a "last updated" date line once the text is finalized.

### `AboutPage.tsx`

- Confirm data-source attributions:
  - DWD reference period for precipitation / ET₀ rasters (which years?)
  - BÜK 200 vs. BÜK 1000 for nFKWe — which one is actually used?
  - Funding / project sponsor mention required?
- Optional: contributor / acknowledgement list.

### Legal review

Both pages should be reviewed by someone with DE data-protection expertise
before the next public release.

### Open-source license obligations

- **react-leaflet** uses the **Hippocratic License 2.1** — non-OSI, contains an
  ethical-use clause. ATB / runlevel3 should confirm this is acceptable for
  the intended distribution channels (e.g. some app stores or institutional
  policies disallow non-OSI licenses).
- **Leaflet (BSD-2-Clause)** requires the copyright notice + disclaimer to be
  preserved in distributed binaries. Currently only listed by name in
  AboutPage. Consider shipping a `LICENSES.txt` (one-time `yarn licenses`
  generation, dropped into `public/`, linked from About).
- **Roboto (Apache 2.0)** — fonts bundled in `app/public/fonts/`. Apache 2.0
  requires a NOTICE file if one accompanies the original work. Worth shipping
  alongside the font files.
- **OpenStreetMap** — visible attribution is already present in the map view
  (`LocationPicker.tsx`). No further action required.
- Consider running `yarn dlx license-checker --production --summary` once
  before release to confirm no GPL / AGPL / SSPL packages have crept in.
