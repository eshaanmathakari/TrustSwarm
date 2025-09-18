"""Scraper for LiveScore live football matches."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any, Dict, List

BASE_DIR = Path(__file__).resolve().parents[2]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from common import fetch_text  # type: ignore  # noqa: E402

LIVE_URL = "https://www.livescore.com/en/football/live/"


def _extract_state(html: str) -> Dict[str, Any]:
    pattern = re.compile(r"__NUXT__=(\{.*?\});", re.DOTALL)
    match = pattern.search(html)
    if not match:
        raise RuntimeError("LiveScore content blob not found. Site structure may have changed.")
    return json.loads(match.group(1))


def get_live_matches() -> List[Dict[str, Any]]:
    html = fetch_text(LIVE_URL)
    data = _extract_state(html)
    matches = data.get("data", [{}])[0].get("events", [])
    results: List[Dict[str, Any]] = []
    for match in matches:
        results.append({
            "competition": match.get("CLN"),
            "home": match.get("T1")["N"] if match.get("T1") else None,
            "away": match.get("T2")["N"] if match.get("T2") else None,
            "score": {
                "home": match.get("T1").get("S") if match.get("T1") else None,
                "away": match.get("T2").get("S") if match.get("T2") else None,
            },
            "status": match.get("Eps"),
            "start_time": match.get("Esd"),
        })
    return results


if __name__ == "__main__":
    print(get_live_matches())
