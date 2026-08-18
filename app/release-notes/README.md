# Release notes

## The short version

**`PENDING.txt` is the only file you paste into the Play Console.** It holds the
store text for everything released since the last upload. After uploading:
**delete it**. The next change starts a new one.

```
new user-visible change   →  append a bullet to PENDING.txt
upload to the Play Store  →  paste PENDING.txt whole, then delete it
next change after that    →  create PENDING.txt again (one bullet)
```

Nothing else needs touching for a routine release.

## Why it works this way

Web releases and Play uploads do not line up. The site is deployed several times
a day; the app is uploaded when there is something worth uploading. With one
store text per version, an upload covering four web releases meant reading four
`.txt` files and merging them by hand at the moment of least patience.

`PENDING.txt` accumulates instead. It always answers "what would a user get if I
uploaded right now" — and deleting it after an upload is what marks the boundary,
so the state lives in the filesystem rather than in someone's memory.

## Appending

The file is pasted **verbatim**, so it contains nothing but the locale block — no
comments, no notes to self. Between uploads it sits with a heading and no bullets;
that is the empty state, and `buildAndroid.sh` will not copy it next to a bundle
until it has at least one bullet.

- One bullet per user-visible change, in the same `<de-DE>…</de-DE>` block. Do not
  start a second block, and do not add a second heading.
- Adjust the heading when it stops fitting — `Verbesserungen`, `Fehlerbehebung`,
  `Aktualisierte Klimadaten` have all been used.
- Write for someone who does not know the app changed. "Der Zusatzwasserbedarf
  fällt meist höher aus" — not "FAO-56 statt evapo_p".
- If a later change supersedes an earlier bullet, **edit that bullet** rather than
  appending a correction. Users see one list, not a history.
- Build tooling, refactors and anything invisible to users do not belong here.
  They go in the per-version `.md`.

## The 500-character limit

The Play Console truncates a locale block over **500 characters** — silently, mid
sentence, and only visible once it is published. The tags do not count, the text
inside does.

An accumulating file will hit this. When it does, shorten existing bullets rather
than dropping a change: several small releases usually collapse into one clear
sentence, and users care about the effect, not the number of releases it took.

Check before uploading — do not estimate:

```bash
python3 scripts/check-release-notes.py        # checks PENDING.txt
```

`scripts/buildAndroid.sh` runs the same check and **aborts the release build** if
the file is over budget, so a truncated listing cannot reach the store by
accident.

## Formatting rules

- Store text is **German** (`de-DE`, the store listing's language).
- **Do not wrap lines inside the tag block.** A hard wrap becomes a visible line
  break in the store listing.
- Paste the file *including* the `<de-DE>` tags; the Console expects them.

## The per-version `.md` files

`<version>.md` is the technical record of a single release: what changed, why,
what was validated, what was deliberately left alone. These are **not** store
text and are not pasted anywhere. Keep writing one per release that is worth
explaining — 0.1.44 carries the Potsdam validation of the climate-data switch,
for instance, and the feedback tracker cites these files.

They are independent of `PENDING.txt`: the `.md` explains one version to us, the
`.txt` explains several versions to users.

Historic per-version `.txt` files were removed when this scheme was introduced
(0.1.47); their content lives on in the corresponding `.md` and, for 0.1.42 and
0.1.43, in what was already published to the store.

## What `buildAndroid.sh` copies

Next to the generated `app-release.aab` it places:

- `RELEASE-NOTES-<version>.txt` — a copy of `PENDING.txt`, so whoever uploads has
  the text to hand;
- `RELEASE-NOTES-<version>.md` — the per-version record, if one exists.

Those copies live under `app/android/app/build/`, which is gitignored and wiped by
a clean build. The files in this directory are the originals.
