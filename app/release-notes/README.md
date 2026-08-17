# Release notes

Two files per released version:

- **`<version>.txt`** — the store text in the locale-tagged form the Play Console
  takes verbatim. Paste the whole file, tags included:

  ```
  <de-DE>
  Korrektur der Zusammenfassung
  …
  </de-DE>
  ```

- **`<version>.md`** — the human-readable record: what the build contained, what it
  did not, and the same store text quoted for context.

`scripts/buildAndroid.sh` copies both next to the generated `app-release.aab` so
the notes travel with the artefact. Those copies live under
`app/android/app/build/`, which is gitignored and wiped by a clean build — the
files here are the originals.

Conventions:

- Store text is **German** (`de-DE`, the store listing's language). Each locale
  block has its own **500-character** budget, counted on the text *inside* the
  tags; the tags do not count. Measure rather than estimate, and note the count in
  the `.md` — a plausible-looking guess was over the limit once already.
- **Do not wrap lines inside a tag block.** A hard wrap becomes a visible line
  break in the store listing.
- Describe user-visible changes only in the store text. Build tooling and internal
  refactors belong in the `.md`'s "What is in this build" section.
- Record anything committed *after* the bundle was built, so it is obvious what a
  rebuild would add — and check whether the deployed web app matches.
