# Mais Zuschlag

- Aktuell werden beim Zuckermais automatisch +20 mm Zusatzbewässerung berücksichtigt. Dieser Zuschlag gilt laut Merkblatt jedoch ausschließlich für Körnermais, nicht für Zuckermais.

- Körnermais ist nicht als eigene Kultur in der App abgebildet, gehört aber zur
  gleichen Nutzungsfamilie wie Silomais (Futteranbau) und nicht zu Zuckermais
  (Gemüsebau).

## Vorschlag:

- +20 mm beim Zuckermais entfernen

- Körnermais als Auswahloption bei Silomais hinzufügen und bei Auswahl:  +20mm  Zuschlag (mit Erläuterung)

**Status: ✅ erledigt — `f2f3087` / `0e1104d`**

Befund nach Code-Prüfung: der +20-mm-Auto-Zuschlag wurde tatsächlich auf
**Silomais** angewandt, nicht auf Zuckermais (Zuckermais läuft im
`gemueseObst`-Modul ohne Auto-Zuschlag). Die Anmerkung war im Effekt korrekt:
laut Merkblatt § 4.2.2 bekommt **Körnermais** den +20-mm-Zuschlag, nicht
Silomais.

Umsetzung:

- `cropNames` in `src/constants/plantNames.ts`: `Silomais` ersetzt durch
  `Silomais|Silomais` und `Silomais|Körnermais`. Variant-Picker erscheint
  automatisch.
- `rawCropDataNorm` und `rawCropDataDry` in `src/constants/plantDataRaw.ts`:
  Silomais-Tabellenwerte für beide Schlüssel dupliziert (alle 8 KWBv-Klassen).
- `AUTO_SURCHARGE_MM` in `src/lib/calculations/hauptkulturen.ts`: +20 mm jetzt
  auf `Silomais|Körnermais` (und weiterhin `Kartoffeln`).
- Hinweistext im Variant-Picker für Silomais erläutert den +20-mm-Zuschlag bei
  Körnermais.

# Auswahl bei einziger Option

## Bei Futterpflanzen

Bei allen außer "Welsches Weidelgras", welches zwei Varianten zur Auswahl hat, muss man eine Auswahl für Variante treffen obwohl es nur eine Option gibt, was für mich etwas komisch wirkt.

Aber ich verstehe auch, dass das wohl einfacher ist für das Layout.

Aber ich würde hier auch noch einmal ausführen, dass es um Schnitte zur Samennutzung geht, statt "Variante 1/2"

**Status: ✅ erledigt — `0e1104d`**

Anmerkung valide. `hasVariants` lieferte `true` sobald irgendeine Option ein
`level1`-Tag hatte, auch wenn nur eine Option in der Gruppe war —
Single-Variant-Gruppen wie `Knaulgras|1` zwangen unnötig zu Klick.

Umsetzung:

- `hasVariants` in `src/utils/plantNameParser.ts`: liefert nur noch `true` bei
  `group.length > 1`.
- `resolveKey` in `AssignmentPage.tsx`: liefert bei `opts.length === 1`
  direkt `opts[0].fullKey` (auch wenn `level1` gesetzt ist).
- Heading-Text "Variante wählen" → "Schnitte zur Samennutzung wählen" für
  `plantCategory === 'futter'`.

## Bewässerungszeitraum

Es wird immer nur ein möglicher Zeitraum angeboten (z. B. April–Mai), muss aber aktiv
ausgewählt werden

- Auch ohne Auswahl werden bereits Werte angezeigt.
  Woher kommen diese Werte? Das verstehe ich nicht.
  Wenn diese keine Berechtigung haben, denke ich es wäre gut den Zeitraum automatisch zu setzen, um Verwirrungen zu reduzieren.

**Status: ✅ erledigt — `0e1104d` + `f2f3087`**

Anmerkung valide. State war auf hardcodiertes `April-early` bis
`September-late` initialisiert, daher Berechnung lief gegen Default-Zeitraum
bevor User auswählte.

Umsetzung:

- `irrigationPeriod` Initialwert nicht mehr auf Default; bleibt `undefined`
  bis Auswahl getroffen wurde.
- Helfer `autoSetIrrigationPeriod`: bei einziger verfügbarer Periode wird
  diese direkt beim Auswählen der Kultur gesetzt.
- Berechnung in der IIFE bricht für `gemuese_obst` ab wenn
  `irrigationPeriod` undefined.
- Followup `f2f3087`: Radio wird auch bei nur einer Option angezeigt, damit
  User die automatische Auswahl sieht.

# Zwischenfrucht-Zuschlag - **inkonsistente Anwendung**

Bei manchen Kulturen funktioniert der Zwischenfrucht Zuschlag nicht:

- Insbesondere bei Futterpflanzen: bei denjenigen, wo man den Bewässerungszeitraum nicht aussucht, und niedrige Werte sind: --> Bei 0 Anfangs-Werten wird der Zuschlag nicht hinzugefügt oder nur 2mm.

- z.T. Normaljahr von 0mm/a auf 0–2 mm/a; bei Trockenjahr von 0-12mm/a auf 2–22 mm/a. Also +2mm/a bei den unteren Werten, 10 bei den oberen.

- z.T. Normaljahr von 0mm/a auf 0mm/a; bei Trockenjahr von 0-12mm/a auf 2–22 mm/a

- z.T. Normaljahr von 0mm/a auf 0mm/a; bei Trockenjahr von höhere Zahlen, mit jeweils 10mm Zuschlag

-> Woher kommen diese Zahlen?  

Aber wenn man den Bewässerungszeitraum auswählt dann ist es richtig

**Also erledigt sich, wenn man die
Bewässerungszeitraum Zuteilung automatisch macht**

**Status: ✅ erledigt — `0e1104d`**

Symptom valide; Wurzelursache war doppelt: (a) Periode nicht automatisch
gesetzt → KWB-Korrektur aus zufälligem Default; (b) Zwischenfrucht-Zuschlag
war im Code für Gemüse/Obst aktiv, obwohl Merkblatt § 4.3 ihn nur in § 4.2.2
für Hauptkulturen vorsieht.

Umsetzung:

- `surchargeIntermediate` in `GemueseObstInput` entfernt; +10-mm-Term in
  `gemueseObst.ts` entfernt.
- Zwischenfrucht-Checkbox in `AssignmentPage.tsx` nur noch für
  `module === 'hauptkulturen'`.
- Periodenauswahl: siehe oberen Abschnitt.

# Weinbau Zwischenfrucht-Zuschlag funktioniert nicht

Beim Weinbau hat die Auswahl „Zwischenfrucht (+10 mm)" keine Wirkung

**Status: ✅ erledigt — `0e1104d`**

Anmerkung valide. `WeinbauInput` hatte nie ein `surchargeIntermediate`-Feld;
`calculateWeinbau` hat den Zustand der Checkbox nie verarbeitet. Merkblatt
§ 4.3.4 (Weinbau) definiert keine Zuschläge.

Umsetzung:

- Zuschläge-Section in `AssignmentPage.tsx` rendert nur noch für
  `hauptkulturen` und `gemuese_obst`. Für Weinbau erscheint die Checkbox
  nicht mehr.

# Transparenz der Zuschläge

In Szenario-Ansicht und PDF Export wird nicht angezeigt, welche Zuschläge GENAU
angewendet wurden, was ich ziemlich sinvoll fände.

**Status: ✅ erledigt — `0e1104d`**

Anmerkung valide. Ergebnisobjekte hatten nur `optionalSurchargeMm` (Summe);
Einzelposten gingen verloren.

Umsetzung:

- `HauptkulturenResult` erweitert um `autoSurchargeLabel`,
  `surchargeIntermediateMm`, `surchargeEmergenceMm`, `surchargeHeavySoilMm`.
- `GemueseObstResult` erweitert um `surchargeEmergenceMm`.
- `HauptkulturenResult.tsx`, `GemueseObstResult.tsx`, `PdfZuschlaegeBlock.tsx`:
  je eine Zeile pro Zuschlag ("Zwischenfrucht +10 mm", "Auflaufbewässerung
  +N mm", "Schwere Böden +N mm", "Automatisch: Speisekartoffeln/Körnermais").

# Benutzerdefinierte Zusatzbewässerung

Idee:  Landwirtinnen können zusätzliche Bewässerung optional angeben für Kulturen ohne Literaturwerte? Aber klar als benutzerdefiniert markieren.

**Status: ✅ erledigt**

Umsetzung:

- Neues Feld `userCustomMm` in `FieldAssignment` (`src/types/project.ts`).
- Beide Kalkulationsmodule (`hauptkulturen`, `gemueseObst`) akzeptieren
  `userCustomMm` und nutzen ihn als Basiswert wenn kein Literaturwert vorliegt.
  Für Gemüse/Obst wird zudem die Klima-Korrektur (ΔKWB × rFactor)
  übersprungen — Anwendereingabe gilt direkt.
- Neue Result-Felder `isUserCustom` + `userCustomMm` für Transparenz.
- Eingabe-Section in `AssignmentPage.tsx` erscheint nur wenn kein
  Literaturwert vorhanden (Eingabe oder bereits gesetzter Anwenderwert).
- Result-Cards (`HauptkulturenResult.tsx`, `GemueseObstResult.tsx`) zeigen
  „benutzerdefiniert"-Tag im Header und im Berechnungsgrundlagen-Block.
- PDF-Export (`PdfErgebnisBlock.tsx`, `PdfZuschlaegeBlock.tsx`) markiert
  benutzerdefinierte Ergebnisse explizit.
- Wert wird in `getAssignmentResult` dispatcher mitgegeben.

# Alternative Wasserquellen bei Grün-, Sportflächen und Tennen

Aktuell optional: „können abgezogen werden."

**MÜSSEN abgezogen werden**

(Müssen prioritisiert werden und abgezogen werden)

**Status: ✅ erledigt — `0e1104d`**

Anmerkung valide. Eingabe war optionales Zahlenfeld; konnte stillschweigend
übersprungen werden.

Umsetzung:

- Hinweistext umformuliert: „Verfügbare alternative Wasserquellen müssen vom
  Bruttobedarf abgezogen werden (Netto-Antragsmenge)."
- Eingabe ersetzt durch Radio-Auswahl: „Keine alternativen Wasserquellen
  vorhanden" vs. „Wasserquellen vorhanden:" + bedingtes m³/a-Feld.
- `altWasserM3 === 0` ist gültige explizite Antwort „keine"; `undefined` löst
  Pflicht-Hinweis aus.
- `getMissingData` in `getAssignmentResult.ts` markiert fehlende Antwort für
  alle Sport-/Grünflächenmodule.

---

# Bonus-Befund (nicht in Original-REMARKS, aber aus Spec-Abgleich)

Bei der Code/Spec-Prüfung wurde sichtbar: der Zwischenfrucht-Zuschlag
(+10 mm) war im Code zusätzlich für Gemüse/Obst aktiv — Merkblatt § 4.3
sieht für Gemüse/Obst aber nur die Auflaufbewässerung (A/J, Tab. 21) vor,
keinen Zwischenfrucht-Zuschlag. Wurde mit entfernt (siehe oben unter
„Zwischenfrucht-Zuschlag inkonsistente Anwendung").

## Auflaufbewässerung für Hauptkulturen (Spec § 4.2.2)

Merkblatt § 4.2.2 erlaubt für Hauptkulturen einen Zuschlag von bis zu
+20 mm/a für Frühjahrstrockenheit (Auflaufen von Saatgut, Anwachsen von
Pflanzgut). Der entsprechende Slider war in `AssignmentPage.tsx` als
auskommentierter Block vorhanden, aber nicht aktiv. Aktiviert: Hauptkulturen
zeigen jetzt den Auflauf-Slider (0–20 mm) zusätzlich zur Zwischenfrucht-
Checkbox. State `surchargeEmergence` wird beim Modulwechsel zurückgesetzt.

## Cleanup

Toter, auskommentierter `IrrigationPeriodPicker`-Block in
`AssignmentPage.tsx` entfernt. Auskommentierter alter Auflauf-Slider durch
aktive Implementierung ersetzt.
