# Offene rechtliche Punkte

Stand: 2026-07-20. Diese Datei sammelt rechtliche Punkte, die **nicht im Code**
gelöst werden können und von ATB / einer juristischen Prüfung bestätigt werden
müssen, bevor die App öffentlich beworben wird.

## Offen

- [ ] **DWA-M 590 – Reproduktionsrechte.** Die App gibt Tabellenwerte und die
  Berechnungsmethodik aus dem Merkblatt DWA-M 590 wieder. DWA-Merkblätter sind
  urheberrechtlich geschützte Publikationen. Zu klären: Liegt eine Erlaubnis der
  DWA vor, die Tabellen/Werte wiederzugeben (nicht nur zu zitieren)? Ansprech­
  partner: DWA e.V. (https://www.dwa.de). Fachliche Begleitung durch ATB ersetzt
  die Reproduktions­lizenz nicht automatisch.

- [ ] **Aufsichtsbehörde bestätigen.** In der Datenschutzerklärung ist als
  zuständige Aufsichtsbehörde die LDA Brandenburg angegeben (Sitz Potsdam). Von
  ATB/Datenschutzbeauftragtem bestätigen lassen, dass dies für das ATB als
  Verantwortlichen zutrifft. Siehe `PRIVACY.supervisoryAuthority` in
  `app/src/constants/contact.ts`.

- [ ] **Juristische Gesamtprüfung.** Impressum, Datenschutz und Haftungs­
  ausschluss vor öffentlicher Bewerbung von einer rechtskundigen Stelle prüfen
  lassen.

- [ ] **OSM-Tile-Nutzung.** Die App lädt Kartenkacheln direkt von
  `tile.openstreetmap.org`. Die OSMF-Tile-Usage-Policy untersagt „heavy use“.
  Bei steigender Nutzung auf einen eigenen/kostenpflichtigen Tile-Dienst
  wechseln. https://operations.osmfoundation.org/policies/tiles/

## Erledigt

- [x] Third-Party-Lizenztexte gebündelt (`THIRD-PARTY-LICENSES.txt`), im
  ?-Dialog verlinkt.
- [x] Impressum-Abschnitt (§ 5 DDG) im ?-Dialog, Link auf die vollständige
  ATB-Anbieterkennzeichnung.
- [x] Haftungsausschluss für Berechnungsergebnisse.
- [x] Datenschutz: Datenschutzbeauftragte(r), Beschwerderecht/Aufsichtsbehörde,
  Link auf die vollständige ATB-Datenschutzerklärung.
- [x] Betreiber-/Verantwortlichen-Kontakt zeigt die ATB-Adresse.
