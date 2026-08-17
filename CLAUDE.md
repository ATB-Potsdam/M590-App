# CLAUDE.md

Repository-wide guidance for Claude Code. See `app/CLAUDE.md` for the detailed
frontend/app architecture notes.

## This repository is public

`ATB-Potsdam/M590-App` is publicly readable. Internal documentation therefore
lives in the **private** companion repository `M590-doc`, cloned into the
gitignored `app/doc/`:

```bash
git clone git@github.com:ATB-Potsdam/M590-doc.git app/doc
```

It holds the tester correspondence (`feedback/`, real names and assessments), the
DWA-M 590 Gelbdruck draft (third-party copyright) and the internal specs quoting
it. **Never commit that material here** — not the files, not quotations from
them. Referencing a path (e.g. "see `app/doc/feedback/README.md`") in a code
comment is fine; pasting the content is not. The two repositories push
separately: when a change spans both, push both.

## Tester feedback tracker

Whenever a change addresses a point from the tester correspondence — or a point's
status moves (implemented, blocked, question sent, answered) — **update the
feedback tracker in the same batch of work**, in the private `app/doc/` repo:

1. Edit the `ITEMS` list in `app/doc/feedback/make_tracker.py` — that file is the
   source, `Feedback-Tracker.xlsx` is generated and must never be hand-edited.
2. Regenerate: `uv run app/doc/feedback/make_tracker.py`.
3. Keep `app/doc/feedback/README.md` in step: the correspondence table and the
   "Open questions" list.
4. Commit both the script and the regenerated `.xlsx` in `app/doc/`.

In the "Umgesetzt in" column name the **released version** (e.g. `0.1.42 (…)`)
once the change has shipped, not just the reply it was announced in — the point of
the column is to tell a tester which version to verify against.

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
