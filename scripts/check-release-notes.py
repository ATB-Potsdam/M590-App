#!/usr/bin/env python3
"""Check app/release-notes/STORE-TEXT.txt against the Play Console's limits.

The Play Console silently truncates a "What's new" text that exceeds 500
characters per locale, so an over-long file is not obvious until users see a
sentence cut mid-word. STORE-TEXT.txt is a rolling window — new bullets are
appended and the oldest are dropped to stay within budget — so overflow is a
matter of when, not if, hence a check rather than a habit.

Usage:
    python3 scripts/check-release-notes.py            # checks STORE-TEXT.txt
    python3 scripts/check-release-notes.py FILE ...   # checks specific files

Exits non-zero if any locale block is over budget.
"""

import re
import sys
from pathlib import Path

LIMIT = 500

# The tags themselves do not count towards the budget, only the text inside.
BLOCK = re.compile(r"<([a-zA-Z-]+)>(.*?)</\1>", re.DOTALL)


def check(path: Path) -> bool:
    if not path.exists():
        # Unlike the old per-upload file, this one is never emptied: it is the
        # store listing as it currently stands, so its absence is a real fault.
        print(f"{path.name}: missing — the store text should always exist")
        return False

    text = path.read_text(encoding="utf-8")
    blocks = BLOCK.findall(text)
    if not blocks:
        print(f"{path}: no <locale>…</locale> block found")
        return False

    ok = True
    for locale, body in blocks:
        n = len(body.strip())
        status = "ok" if n <= LIMIT else "OVER LIMIT"
        print(f"{path.name} [{locale}]: {n}/{LIMIT} chars ({status}, {LIMIT - n:+d})")
        if n > LIMIT:
            ok = False

        # A heading with no bullets would be pasted as an empty "What's new".
        bullets = [ln for ln in body.splitlines() if ln.lstrip().startswith("•")]
        if not bullets:
            print("  WARNING: no bullets — this would publish an empty \"What's new\"")
            ok = False

        # A hard wrap inside the block shows up as a line break in the store, so
        # long bullets must stay on one line. Blank lines and the heading are fine.
        for line in body.strip().splitlines():
            if len(line) > 300 and not line.lstrip().startswith("•"):
                print(f"  warning: very long non-bullet line ({len(line)} chars)")

    return ok


def main() -> int:
    args = sys.argv[1:]
    if args:
        paths = [Path(a) for a in args]
    else:
        paths = [Path(__file__).resolve().parent.parent / "app" / "release-notes" / "STORE-TEXT.txt"]

    return 0 if all(check(p) for p in paths) else 1


if __name__ == "__main__":
    sys.exit(main())
