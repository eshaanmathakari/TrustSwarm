"""Fetch Formula 1 race results from the public Ergast API."""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict

BASE_DIR = Path(__file__).resolve().parents[2]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from common import fetch_json, rate_limited_sleep  # type: ignore  # noqa: E402

BASE_URL = "https://ergast.com/api/f1"


def get_current_season_results() -> Dict[str, Any]:
    url = f"{BASE_URL}/current/results.json"
    data = fetch_json(url, timeout=10.0)
    rate_limited_sleep(0.5)
    return data


def get_race_results(season: int, round_number: int) -> Dict[str, Any]:
    url = f"{BASE_URL}/{season}/{round_number}/results.json"
    data = fetch_json(url, timeout=10.0)
    rate_limited_sleep(0.5)
    return data


if __name__ == "__main__":
    print(get_current_season_results()["MRData"]["RaceTable"].get("Races", [])[:1])
