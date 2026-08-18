#!/usr/bin/env python3
"""Check app/release-notes/PENDING.txt against the Play Console's limits.

The Play Console silently truncates a "What's new" text that exceeds 500
characters per locale, so an over-long file is not obvious until users see a
sentence cut mid-word. PENDING.txt accumulates bullets across releases, which
makes overflow a matter of when, not if — hence a check rather than a habit.

Usage:
    python3 scripts/check-release-notes.py            # checks PENDING.txt
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
        # Absent is the normal state right after a Play upload: the file is
        # pasted and deleted, and the next user-visible change recreates it.
        # Only an over-budget file is a failure.
        print(f"{path.name}: not present — nothing pending since the last upload")
        return True

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
        paths = [Path(__file__).resolve().parent.parent / "app" / "release-notes" / "PENDING.txt"]

    return 0 if all(check(p) for p in paths) else 1


if __name__ == "__main__":
    sys.exit(main())
