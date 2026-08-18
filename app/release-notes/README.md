# Release notes

## The short version

**`STORE-TEXT.txt` is the "What's new" text as it currently stands.** It is always
ready to paste into the Play Console, and it is **never emptied**.

```
new user-visible change   →  append a bullet at the END
over 500 characters       →  drop bullets from the TOP until it fits
upload to the Play Store  →  paste the file; leave it exactly as it is
```

Nothing to reset, nothing to recreate. The file always shows what a user would
read in the store today.

## Why it works this way

Web releases and Play uploads do not line up: the site is deployed several times a
day, the app is uploaded when there is something worth uploading. A file that is
cleared after each upload loses the context those uploads shared — a user opening
the store listing sees only whatever happened since the last upload, which may be
a single obscure bug fix.

A rolling window keeps the most recent changes visible **regardless of which
upload first carried them**. The newest bullets are always present; the oldest
fall off when the budget forces it. That matches how the listing is actually read:
as "what is new about this app", not "what changed in build 52".

## Appending

The file is pasted **verbatim**, so it contains nothing but the locale block — no
comments, no notes to self.

- Add new bullets at the **end** of the `<de-DE>…</de-DE>` block. Do not start a
  second block, and do not add a second heading.
- Write for someone who does not know the app changed. "Der Zusatzwasserbedarf
  fällt meist höher aus" — not "FAO-56 statt evapo_p".
- If a later change supersedes an earlier bullet, **edit that bullet** rather than
  appending a correction. Users see one list, not a history.
- Build tooling, refactors and anything invisible to users do not belong here.
  They go in the per-version `.md`.
- Adjust the heading when it stops fitting — `Neuerungen`, `Verbesserungen`,
  `Fehlerbehebung` have all been used.

## The 500-character limit

The Play Console truncates a locale block over **500 characters** — silently, mid
sentence, and only visible once published. The tags do not count, the text inside
does.

When an append pushes it over, **drop bullets from the top**: they are the oldest
and have been in the listing longest. This is a judgement call, not a mechanical
one — an old bullet that still matters (the climate-data change affects every
result a user sees) can outrank a newer, narrower one. Rewriting two bullets into
one is often better than deleting either.

Check before uploading — do not estimate:

```bash
python3 scripts/check-release-notes.py        # checks STORE-TEXT.txt
```

`scripts/buildAndroid.sh` runs the same check and **aborts the release build** if
the file is over budget or has no bullets, so a truncated or empty listing cannot
reach the store by accident.

## Formatting rules

- Store text is **German** (`de-DE`, the store listing's language).
- **Do not wrap lines inside the tag block.** A hard wrap becomes a visible line
  break in the store listing.
- Paste the file *including* the `<de-DE>` tags; the Console expects them.

## The per-version `.md` files

`<version>.md` is the technical record of a single release: what changed, why,
what was validated, what was deliberately left alone. These are **not** store text
and are not pasted anywhere. Keep writing one per release that is worth
explaining — 0.1.44 carries the Potsdam validation of the climate-data switch, for
instance, and the feedback tracker cites these files.

They are independent of `STORE-TEXT.txt`: the `.md` explains one version to us, the
`.txt` describes the app to users.

## History of this directory

- Until 0.1.46 there was one `<version>.txt` per release. An upload covering four
  web releases meant merging four files by hand.
- 0.1.47 replaced them with `PENDING.txt`, accumulating since the last upload and
  deleted afterwards.
- 0.1.48 made it a rolling window and renamed it `STORE-TEXT.txt`: never emptied,
  trimmed from the top when it exceeds the limit. Deleting it after an upload had
  the effect that a small follow-up release published a listing mentioning only
  that small change.

## What `buildAndroid.sh` copies

Next to the generated `app-release.aab` it places:

- `RELEASE-NOTES-<version>.txt` — a copy of `STORE-TEXT.txt`, so whoever uploads
  has the text to hand;
- `RELEASE-NOTES-<version>.md` — the per-version record, if one exists.

Those copies live under `app/android/app/build/`, which is gitignored and wiped by
a clean build. The files in this directory are the originals.
