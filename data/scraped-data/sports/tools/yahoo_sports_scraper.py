"""Scraper for Yahoo Sports NBA scoreboard."""
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

SCOREBOARD_URL = "https://sports.yahoo.com/nba/scoreboard/"


def _extract_json_blob(html: str) -> Dict[str, Any]:
    pattern = re.compile(r"root.App.main = (\{.*?\});", re.DOTALL)
    match = pattern.search(html)
    if not match:
        raise RuntimeError("Unable to locate Yahoo Sports data blob.")
    return json.loads(match.group(1))


def get_scoreboard() -> List[Dict[str, Any]]:
    html = fetch_text(SCOREBOARD_URL)
    payload = _extract_json_blob(html)
    games = payload["context"]["dispatcher"]["stores"]["ScoreboardStore"]["games"]
    results: List[Dict[str, Any]] = []
    for game in games:
        results.append({
            "gameId": game["gameId"],
            "status": game["statusType"]["description"],
            "home": game["homeTeam"],
            "away": game["awayTeam"],
            "venue": game.get("venue"),
        })
    return results


if __name__ == "__main__":
    print(get_scoreboard())
