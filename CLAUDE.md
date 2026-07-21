# CLAUDE.md

Repository-wide guidance for Claude Code. See `app/CLAUDE.md` for the detailed
frontend/app architecture notes.

## Language

**Everything written in this repository must be in English.** This applies to:

- All documentation and Markdown files (`*.md`), including TODO/task notes.
- Code comments and commit messages.
- Generated developer-facing text (e.g. the `THIRD-PARTY-LICENSES.txt` preamble
  produced by `app/scripts/gen-third-party-licenses.cjs`).
- Identifiers, variable names, and code structure.

**Exceptions:**

- **User-facing product copy stays in its target-market language** — the app UI
  is German, and store listings such as `app/todo/PlaystoreText.txt` remain
  German on purpose. Do not translate these.
- **Domain proper nouns / regulatory terms** from DWA-M 590 (e.g. module names
  like `weinbau`, `gruenflaechen`, table/factor names) stay as-is; they are
  established terminology, not prose to translate.
- Verbatim quotations of German source material (e.g. quoting the German store
  listing) stay in the original language.

When in doubt for developer-facing prose: write it in English.
