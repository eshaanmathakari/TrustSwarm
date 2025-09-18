"""Fetch NFL scoreboard from ESPN's public JSON feed."""
from __future__ import annotations

import sys
from datetime import date
from pathlib import Path
from typing import Any, Dict

BASE_DIR = Path(__file__).resolve().parents[2]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from common import fetch_json, rate_limited_sleep  # type: ignore  # noqa: E402

API_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"


def get_scoreboard(target_date: date | None = None) -> Dict[str, Any]:
    """Return the NFL scoreboard for the supplied date (defaults to today)."""
    params: Dict[str, Any] = {}
    if target_date:
        params["dates"] = target_date.strftime("%Y%m%d")
    data = fetch_json(API_URL, params=params, timeout=10.0)
    rate_limited_sleep(0.5)
    return data


if __name__ == "__main__":
    print(get_scoreboard())
