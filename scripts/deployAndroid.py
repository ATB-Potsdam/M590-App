#!/usr/bin/env python3
"""Publish an Android release to the Google Play Console.

Uploads only what actually changed: the .aab always (a new versionCode is the
point of a release), and listing assets — icon, feature graphic, screenshots —
plus the "What's new" texts only when their content differs from what Play
already serves. Play charges no penalty for re-uploading an identical image, but
it does replace the asset and reshuffle its ordering, so "upload everything every
time" makes every release look like a listing overhaul in the change history.

Usage:
    scripts/deployAndroid.py                    # publish app/android/.../*.aab
    scripts/deployAndroid.py --screenshots      # capture screenshots first
    scripts/deployAndroid.py --track beta       # default: internal
    scripts/deployAndroid.py --dry-run          # show the plan, change nothing
    scripts/deployAndroid.py --aab PATH         # use a specific bundle

Credentials come from app/.env.local (see app/.env.example):

    M590_PLAY_SERVICE_ACCOUNT=/abs/path/to/play-service-account.json
    M590_PLAY_PACKAGE=de.runlevel3.m590

The service account needs "Release manager" in Play Console -> Users. The
environment overrides the file, as everywhere else in this repo.

Nothing is committed to Play until every step succeeded: the Play API is
edit-based, and the edit is only committed at the very end. An aborted run
leaves the listing exactly as it was.

Default track is "internal" on purpose. Promoting to production is a decision,
not a side effect of running a script.
"""

import argparse
import hashlib
import os
import re
import subprocess
import sys
import zipfile
from pathlib import Path
from typing import NoReturn

REPO = Path(__file__).resolve().parent.parent
APP = REPO / "app"
ENV_LOCAL = APP / ".env.local"
LISTINGS = APP / "store" / "listings"
STORE_TEXT = APP / "release-notes" / "STORE-TEXT.txt"
BUNDLE = APP / "android/app/build/outputs/bundle/release/app-release.aab"

# Which image kinds this script manages, mapped to the Play API's names. Play
# accepts several more (tvBanner, wearScreenshots, ...); adding one is a matter
# of creating the directory and listing it here.
IMAGE_KINDS = {
    "icon": "icon",
    "featureGraphic": "featureGraphic",
    "phoneScreenshots": "phoneScreenshots",
    "sevenInchScreenshots": "sevenInchScreenshots",
    "tenInchScreenshots": "tenInchScreenshots",
}


def fail(msg: str) -> NoReturn:
    print(f"DEPLOY ABORTED: {msg}", file=sys.stderr)
    raise SystemExit(1)


def info(msg: str) -> None:
    print(f"==> {msg}")


def load_env_local() -> dict[str, str]:
    """Read app/.env.local, letting the real environment win.

    Parsed rather than sourced: the file carries comments and empty
    placeholders, and it is shared with Gradle and buildAndroid.sh.
    """
    values: dict[str, str] = {}
    if ENV_LOCAL.exists():
        mode = ENV_LOCAL.stat().st_mode & 0o077
        if mode:
            fail(
                f"{ENV_LOCAL} is accessible to group or others.\n"
                f"    Restrict it before publishing:  chmod 600 {ENV_LOCAL}"
            )
        for line in ENV_LOCAL.read_text().splitlines():
            m = re.match(r"^\s*([A-Z0-9_]+)=(.*)$", line)
            if m:
                values[m.group(1)] = m.group(2).strip()
    # The environment overrides the file; an empty value counts as absent so a
    # copied-but-unfilled .env.example does not look configured.
    for key in ("M590_PLAY_SERVICE_ACCOUNT", "M590_PLAY_PACKAGE"):
        from_env = os.environ.get(key, "").strip()
        if from_env:
            values[key] = from_env
    return {k: v for k, v in values.items() if v}


def parse_store_text() -> dict[str, str]:
    """Split STORE-TEXT.txt into {locale: text}.

    The file is the rolling "What's new" window, already locale-tagged
    (<de-DE>...</de-DE>) and length-checked by scripts/check-release-notes.py.
    """
    if not STORE_TEXT.exists():
        return {}
    blocks = re.findall(r"<([a-zA-Z-]+)>(.*?)</\1>", STORE_TEXT.read_text(), re.DOTALL)
    return {loc: text.strip() for loc, text in blocks}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def local_images(locale: str, kind: str) -> list[Path]:
    d = LISTINGS / locale / ("graphics" if kind in ("icon", "featureGraphic") else kind)
    if not d.is_dir():
        return []
    if kind in ("icon", "featureGraphic"):
        f = d / f"{kind}.png"
        return [f] if f.exists() else []
    # Sorted by name: the filenames carry the display order (01-, 02-, ...).
    return sorted(p for p in d.iterdir() if p.suffix.lower() in (".png", ".jpg", ".jpeg"))


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--track", default="internal",
                    help="Play track: internal (default), alpha, beta, production")
    ap.add_argument("--screenshots", action="store_true",
                    help="run scripts/captureScreenshots.mjs before publishing")
    ap.add_argument("--aab", type=Path, default=BUNDLE, help="bundle to upload")
    ap.add_argument("--dry-run", action="store_true",
                    help="report what would change without touching Play")
    ap.add_argument("--skip-listing", action="store_true",
                    help="upload the bundle only, leave images and texts alone")
    args = ap.parse_args()

    env = load_env_local()
    sa_path = env.get("M590_PLAY_SERVICE_ACCOUNT")
    package = env.get("M590_PLAY_PACKAGE")
    if not sa_path or not package:
        fail(
            "M590_PLAY_SERVICE_ACCOUNT and M590_PLAY_PACKAGE must be set.\n"
            f"    Put them in {ENV_LOCAL} (see app/.env.example) or in the environment."
        )
    if not Path(sa_path).exists():
        fail(f"service account JSON not found at {sa_path}")

    if args.screenshots:
        info("capturing screenshots")
        r = subprocess.run(["node", str(REPO / "scripts/captureScreenshots.mjs")], cwd=REPO)
        if r.returncode:
            fail("screenshot capture failed")

    if not args.aab.exists():
        fail(
            f"bundle not found at {args.aab}.\n"
            "    Build it first:  scripts/buildAndroid.sh"
        )

    # A bundle Play will reject for being unsigned is worth catching here rather
    # than after the upload: an unsigned .aab has no signature block at the
    # archive root. This is exactly the failure the old keystore.properties
    # mechanism produced silently.
    with zipfile.ZipFile(args.aab) as z:
        signed = any(re.fullmatch(r"META-INF/[A-Z0-9_]+\.(RSA|DSA|EC)", n) for n in z.namelist())
    if not signed:
        fail(
            f"{args.aab.name} is not signed — Play would reject it.\n"
            "    Check M590_KEYSTORE / M590_KEYSTORE_PASSWORD / M590_KEY_ALIAS in app/.env.local,\n"
            "    then rebuild with scripts/buildAndroid.sh"
        )

    # google-api-python-client ships no py.typed marker, so everything below the
    # import boundary is untyped to mypy. The ignores are confined to these three
    # lines rather than relaxed for the whole file.
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build  # type: ignore[import-untyped]
        from googleapiclient.http import MediaFileUpload  # type: ignore[import-untyped]
    except ImportError:
        fail(
            "google-api-python-client and google-auth are required.\n"
            "    Install them:  pip install google-api-python-client google-auth"
        )

    creds = service_account.Credentials.from_service_account_file(  # type: ignore[no-untyped-call]
        sa_path, scopes=["https://www.googleapis.com/auth/androidpublisher"]
    )
    service = build("androidpublisher", "v3", credentials=creds, cache_discovery=False)
    edits = service.edits()

    info(f"package {package}, track {args.track}")
    try:
        edit_id = edits.insert(body={}, packageName=package).execute()["id"]
    except Exception as e:  # noqa: BLE001 - surface the API's own message
        fail(f"could not open a Play edit: {e}")

    committed = False
    try:
        # --- Bundle ----------------------------------------------------------
        version_code: int | None = None
        if args.dry_run:
            info(f"[dry-run] would upload {args.aab.name}")
        else:
            media = MediaFileUpload(str(args.aab), mimetype="application/octet-stream", resumable=True)
            up = edits.bundles().upload(editId=edit_id, packageName=package, media_body=media).execute()
            version_code = up["versionCode"]
            info(f"uploaded {args.aab.name} as versionCode {version_code}")

        # --- What's new + track assignment -----------------------------------
        texts = parse_store_text()
        release: dict[str, str | list[str] | list[dict[str, str]]] = {"status": "completed"}
        if version_code is not None:
            release["versionCodes"] = [str(version_code)]
        if texts and not args.skip_listing:
            release["releaseNotes"] = [
                {"language": loc, "text": txt} for loc, txt in texts.items()
            ]
            info(f"release notes for: {', '.join(texts)}")

        if args.dry_run:
            info(f"[dry-run] would assign to track {args.track}")
        else:
            edits.tracks().update(
                editId=edit_id, packageName=package, track=args.track,
                body={"track": args.track, "releases": [release]},
            ).execute()
            info(f"assigned to track {args.track}")

        # --- Listing images: upload only what changed ------------------------
        if not args.skip_listing and LISTINGS.is_dir():
            for locale_dir in sorted(p for p in LISTINGS.iterdir() if p.is_dir()):
                locale = locale_dir.name
                for kind, api_kind in IMAGE_KINDS.items():
                    files = local_images(locale, kind)
                    if not files:
                        continue
                    # Play exposes a sha256 per stored image, so the comparison is
                    # exact rather than a guess from size or mtime.
                    remote = edits.images().list(
                        editId=edit_id, packageName=package,
                        language=locale, imageType=api_kind,
                    ).execute().get("images", [])
                    remote_hashes = {img.get("sha256") for img in remote}
                    local_hashes = {sha256(f) for f in files}
                    if remote_hashes == local_hashes and len(remote) == len(files):
                        info(f"{locale}/{kind}: unchanged ({len(files)} image(s))")
                        continue

                    if args.dry_run:
                        info(f"[dry-run] {locale}/{kind}: would replace with {len(files)} image(s)")
                        continue

                    # Replace wholesale: Play has no reorder call, so the only way
                    # to guarantee the on-store order matches the filenames is to
                    # clear the kind and re-upload in order.
                    edits.images().deleteall(
                        editId=edit_id, packageName=package,
                        language=locale, imageType=api_kind,
                    ).execute()
                    for f in files:
                        edits.images().upload(
                            editId=edit_id, packageName=package,
                            language=locale, imageType=api_kind,
                            media_body=MediaFileUpload(str(f), mimetype="image/png"),
                        ).execute()
                    info(f"{locale}/{kind}: uploaded {len(files)} image(s)")

        # --- Commit ----------------------------------------------------------
        if args.dry_run:
            info("[dry-run] nothing was changed; discarding the edit")
            edits.delete(editId=edit_id, packageName=package).execute()
        else:
            edits.commit(editId=edit_id, packageName=package).execute()
            committed = True
            info(f"committed: versionCode {version_code} is live on track {args.track}")
    finally:
        if not committed and not args.dry_run:
            # Leaving an edit open blocks the next run with "edit already in
            # progress", so clean up even on failure.
            try:
                edits.delete(editId=edit_id, packageName=package).execute()
                info("edit discarded, Play unchanged")
            except Exception:  # noqa: BLE001 - best effort during cleanup
                pass


if __name__ == "__main__":
    main()
