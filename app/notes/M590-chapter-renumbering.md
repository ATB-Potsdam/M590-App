# DWA-M 590: chapter renumbering, Korrekturfahne of 28 May 2026

**Date of change: 2026-08-18.** Applies to every `Kapitel …` / `Kap. …`
reference to DWA-M 590 in this repository.

## What happened

The corrected proof (*Korrekturfahne*) of the DWA-M 590 second edition, dated
**28 May 2026**, inserts a new section **4.1 "Vorbemerkungen"** at the head of
chapter 4.

(The document carries two dates and they mean different things: its running
header says "Korrekturfahne vom 28. Mai 2026" — the proof — while the title page
and footers say "August 2026" with a comment period to 31 October 2026, which is
the issue month of the *Entwurf/Gelbdruck being typeset*. Cite the proof by its
May date.) Everything below it
in chapter 4 moves down by one:

| Old (Gelbdruck) | New (Korrekturfahne) | Section |
| --- | --- | --- |
| — | **4.1** | Vorbemerkungen *(new)* |
| 4.1.x | 4.2.x | Eingangsdaten für landwirtschaftliche und gartenbauliche Kulturen |
| 4.2.x | 4.3.x | Zusatzwasserbedarfe für landwirtschaftliche Hauptkulturen |
| 4.3.x | 4.4.x | Gemüse, Obst und sonstige Kulturen (incl. Weinbau) |
| 4.4.x | 4.5.x | Grünflächen und Sportanlagen |

Chapters 3.x, 5.x and 6.x are **unchanged**. References to `Kapitel 3.5`
(statistical design basis) therefore stayed as they were.

## Why the references had to be fixed

The renumbering does not invalidate a reference — it silently **redirects** it.
`Kapitel 4.2.2` still resolves in the new edition, but to *"Bestimmung der
standortspezifischen nFKWe-Klasse des Bodens"* instead of the intended
*"Ermittlung des Zusatzwasserbedarfs aus Boden- und Klimadaten"* (now 4.3.2).

A reader following a stale reference lands on a real but wrong section. Since
several of these references are user-visible — they appear in result cards and
in the PDF export, where they tell an applicant which part of the Merkblatt
backs a number — leaving them stale would misdirect exactly the audience that
checks them.

## What did *not* change

The May 2026 proof is the corrected proof of the **same second-edition
revision** as the Gelbdruck draft the calculations were built from — not a newer
revision. Both carry the identical "Änderungen gegenüber der Erstauflage (2019)"
list. A full comparison on 2026-08-18 found **no change to any value the app
uses**:

- Tables 3–18 (Hauptkulturen, KWBv class × crop × nFKWe): all 112 crop/zone
  cells identical, cross-checked against `src/constants/plantDataRaw.ts`.
- Table 19 (monthly KWB reference values, Potsdam) — identical, matches
  `refKwb` in `src/constants/soilConstants.ts`.
- Table 20 (correction factor *r*) — identical, matches `rFactor`.
- Tables 21–25 (Gemüse, Obst, Arznei-, sonstige und Futterpflanzen) — identical.
- Tables 26/27 (Weinbau), 29–32 (FLL factors L/G/B/S), 33/34/35/36
  (Naturrasen, Golf, Tennen) — identical; the FLL factors match
  `src/lib/calculations/gruenflaechen.ts`.
- The surcharge rules (Speisekartoffeln +20 mm/a, Kartoffeln on heavy soils
  up to +20 mm/a, Körnermais +20 mm/a, Zwischenfrucht +10 mm/a,
  Auflaufbewässerung up to +20 mm/a) and the rule that empty table cells mean
  *no literature value* rather than *no demand* (the app's `hasValue: false`).

Remaining differences are editorial: expanded abbreviations (`z.B.` → `zum
Beispiel`, `vgl.` → `siehe auch`), small-caps citation style, and new front
matter (foreword, ISBN 978-3-96862-962-9, copyright and gender-language notes).

## What was deliberately left on the old numbering

- **`app/release-notes/0.1.44.md`** — a shipped release note describing the
  edition that was current when 0.1.44 went out. Published notes are a historical
  record; rewriting them would misstate what was said at the time.
- **`app/todo/Tasks.md`** — those entries cite the internal `Funktionsweise3.0.md`
  and its numbering, not the Merkblatt directly, and are completed (`[x]`)
  historical task records.

## Caveats

- The document is an **Entwurf (Gelbdruck), not the Weißdruck.**
  Section numbers can still move before final publication — it still contains at
  least one editorial placeholder ("siehe Abschnitt xy" in the Klimakennung
  section). Re-check the numbering against the Weißdruck when it appears.
- The new edition drops the word "Kapitel" and cites sections as bare numbers
  ("siehe auch 4.2.2"). This repository keeps the `Kapitel N` wording, per
  `app/CLAUDE.md` — the Merkblatt is a worksheet, so `§ N` remains wrong.
- The source PDF lives in the private companion repository (`app/doc/`, see
  `CLAUDE.md`); it is third-party copyright and must not be committed here.
