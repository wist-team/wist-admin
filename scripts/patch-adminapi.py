#!/usr/bin/env python3
"""Apply the admin-app server changes to a copy of adminapi.js.

Usage:  python3 scripts/patch-adminapi.py <path/to/adminapi.js> [--dry-run]

Writes <path>.patched next to the input (never edits in place). Every
replacement must match exactly the expected number of times, otherwise the
script aborts without writing anything — the box copy has drifted from git,
so this is the guard against patching the wrong thing.

Changes (see docs/server-changes.md §1):
  1. mount authGuard (audit mode) after cors()
  2. day span inclusive of today (+1)
  3. meal counts exclude symptom logs whose nutritionData is {}
  4. liked/disliked ratings un-swapped (app stores like = 1)
  5. per-day averages count user-sent rows only
"""
import sys
from pathlib import Path

if len(sys.argv) < 2:
    sys.exit(__doc__)
src = Path(sys.argv[1])
dry = "--dry-run" in sys.argv
text = src.read_text()
orig = text

DATEDIFF = "DATEDIFF(CURDATE(), MIN(st.syft_thread_timestamp))"
DATEDIFF1 = "(DATEDIFF(CURDATE(), MIN(st.syft_thread_timestamp)) + 1)"
MEAL_LIKE = "st.syft_thread_sender_type = 'syft-data' AND st.syft_thread_content LIKE '%nutritionData%'"
MEAL_REAL = (
    "st.syft_thread_sender_type = 'syft-data' AND st.syft_thread_content LIKE '%nutritionData%'"
    " AND st.syft_thread_content NOT LIKE '%\"nutritionData\": {}%'"
    " AND st.syft_thread_content NOT LIKE '%\"nutritionData\":{}%'"
)
WEEKDAY = "COUNT(CASE WHEN DAYOFWEEK(st.syft_thread_timestamp) BETWEEN 2 AND 6 THEN 1 END)"
WEEKEND = "COUNT(CASE WHEN DAYOFWEEK(st.syft_thread_timestamp) IN (1, 7) THEN 1 END)"
USER_ONLY = "st.syft_thread_sender_type = 'user' AND "

# (description, old, new, expected count)
EDITS = [
    (
        "1. mount authGuard after cors()",
        "app.use(cors(corsOptions))\n",
        "app.use(cors(corsOptions))\n"
        "// Admin-app key check (audit mode until WIST_AUTH_MODE=enforce). See API_AUTH_HANDOVER.md.\n"
        'const authGuard = require("./authGuard")\n'
        'app.use(authGuard({ service: "admin", protect: [/^\\//] }))\n',
        1,
    ),
    ("2. day span +1 (all DATEDIFF spans)", DATEDIFF, DATEDIFF1, 9),
    (
        "2b. undo the double +1 inside the weekday/weekend FLOOR()",
        f"FLOOR(({DATEDIFF1} + 1) / 7)",
        f"FLOOR({DATEDIFF1} / 7)",
        2,
    ),
    ("3. meal counts exclude symptom logs (users, meals, stats)", MEAL_LIKE, MEAL_REAL, 3),
    (
        "4a. liked = rating 1 (users)",
        "st.syft_thread_rating = -1 THEN 1 END) AS liked_responses",
        "st.syft_thread_rating = 1 THEN 1 END) AS liked_responses",
        1,
    ),
    (
        "4b. disliked = rating -1 (users)",
        "st.syft_thread_rating = 1 THEN 1 END) AS disliked_responses",
        "st.syft_thread_rating = -1 THEN 1 END) AS disliked_responses",
        1,
    ),
    (
        "4c. liked = rating 1 (stats)",
        "st.syft_thread_rating = -1 THEN 1 ELSE 0 END) AS total_liked_responses",
        "st.syft_thread_rating = 1 THEN 1 ELSE 0 END) AS total_liked_responses",
        1,
    ),
    (
        "4d. disliked = rating -1 (stats)",
        "st.syft_thread_rating = 1 THEN 1 ELSE 0 END) AS total_disliked_responses",
        "st.syft_thread_rating = -1 THEN 1 ELSE 0 END) AS total_disliked_responses",
        1,
    ),
    (
        "5a. avg_messages_per_day counts user rows only",
        "COUNT(st.syft_thread_id) / ",
        "COUNT(CASE WHEN st.syft_thread_sender_type = 'user' THEN 1 END) / ",
        1,
    ),
    ("5b. weekday logs count user rows only", WEEKDAY, WEEKDAY.replace("CASE WHEN ", "CASE WHEN " + USER_ONLY), 2),
    ("5c. weekend logs count user rows only", WEEKEND, WEEKEND.replace("CASE WHEN ", "CASE WHEN " + USER_ONLY), 2),
]

problems = []
for desc, old, new, expected in EDITS:
    n = text.count(old)
    if n != expected:
        problems.append(f"  {desc}: expected {expected} match(es), found {n}")
        continue
    text = text.replace(old, new)
    print(f"ok  {desc} ({n})")

if problems:
    print("\nABORTED — file differs from what this script expects:\n" + "\n".join(problems))
    print("Inspect the box copy by hand around those spots and adjust EDITS before retrying.")
    sys.exit(1)

if dry:
    print(f"\ndry run: {len(orig)} → {len(text)} bytes, nothing written")
else:
    out = src.with_suffix(src.suffix + ".patched")
    out.write_text(text)
    print(f"\nwrote {out} ({len(text)} bytes)")
