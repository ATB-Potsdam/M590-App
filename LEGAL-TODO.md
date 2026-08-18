# Open legal items

As of 2026-07-20. This file collects legal items that **cannot be resolved in
code** and must be confirmed by ATB / a legal review before the app is publicly
promoted.

## Open

- [ ] **DWA-M 590 – reproduction rights.** The app reproduces table values and
  the calculation methodology from the DWA-M 590 code of practice. DWA codes of
  practice are copyrighted publications. To clarify: is there a permission from
  the DWA to reproduce the tables/values (not merely to cite them)? Contact:
  DWA e.V. (https://www.dwa.de). Technical support from ATB does not
  automatically replace the reproduction license.
  Note that this covers **two** things: the tables, and the annex climate map,
  which ships as a polygon layer (`app/public/data/Klimaraeume.fgb`) — the KWBv
  class the app shows is read straight from it.
  On the agenda for the 2026-08-19 meeting (`app/doc/feedback/`, item B).

- [ ] **Who may use the app?** Not settled: freely available to anyone with the
  link (as today), or restricted to subscribers of the code of practice. This is
  the DWA's call rather than a technical one, but the consequences are technical
  and large — the app currently keeps everything in the browser, with no accounts
  and no server holding user data. Any restriction introduces sign-in, user
  administration and a different data-protection position, and is far cheaper to
  plan for than to retrofit. On the agenda for the 2026-08-19 meeting (item A).

- [ ] **Confirm supervisory authority.** The privacy policy names the LDA
  Brandenburg (seat in Potsdam) as the competent supervisory authority. Have
  ATB / the data protection officer confirm that this applies to ATB as the
  controller. See `PRIVACY.supervisoryAuthority` in
  `app/src/constants/contact.ts`.

- [ ] **Overall legal review.** Have the imprint, privacy policy, and
  disclaimer reviewed by a qualified legal party before public promotion.

- [ ] **OSM tile usage.** The app loads map tiles directly from
  `tile.openstreetmap.org`. The OSMF tile usage policy forbids "heavy use".
  Switch to an own/paid tile service as usage grows.
  https://operations.osmfoundation.org/policies/tiles/

## Done

- [x] **Source and licence per dataset** in the ?-dialog (`DATA_SOURCES` in
  `app/src/constants/contact.ts`, rendered by `AboutPage.tsx`). CC BY 4.0 for both
  DWD rasters, ODbL for the map tiles, and the BGR's prescribed citation for the
  soil map. Two errors surfaced while doing this: the nFKWe data is **BÜK250
  V6.0**, not "BÜK 200/1000" as the app and README claimed, and the BGR terms
  require a verbatim citation string that was missing entirely.

- [x] Third-party license texts bundled (`THIRD-PARTY-LICENSES.txt`), linked in
  the ?-dialog.
- [x] Imprint section (§ 5 DDG) in the ?-dialog, link to the full ATB provider
  identification.
- [x] Disclaimer for calculation results.
- [x] Privacy: data protection officer, right to complain/supervisory
  authority, link to the full ATB privacy policy.
- [x] Operator/controller contact shows the ATB address.
