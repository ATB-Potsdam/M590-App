# Release notes

One file per released version (`<version>.md`), holding the text to paste into the
Play Console's "What's new in this release" field plus a record of what the build
actually contained.

`scripts/buildAndroid.sh` copies the matching file next to the generated
`app-release.aab` so the notes travel with the artefact. That copy lives under
`app/android/app/build/`, which is gitignored and wiped by a clean build — the
version here is the one that is kept.

Conventions:

- The pasteable block is **German** (the store listing's language) and must stay
  within Play's **500-character** limit. Note the measured length next to the
  heading so the next editor knows the remaining budget.
- Describe user-visible changes only in that block. Build tooling and internal
  refactors belong in the "What is in this build" section below it, not in the
  store text.
- Record anything committed *after* the bundle was built under "Not in this
  build", so it is obvious what a rebuild would add.
