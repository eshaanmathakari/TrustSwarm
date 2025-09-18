"""Retrieve NHL schedule and scores from the NHL Stats API."""
from __future__ import annotations

import sys
from datetime import date
from pathlib import Path
from typing import Any, Dict

BASE_DIR = Path(__file__).resolve().parents[2]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from common import fetch_json, rate_limited_sleep  # type: ignore  # noqa: E402

API_URL = "https://statsapi.web.nhl.com/api/v1/schedule"


def get_schedule(target_date: date | None = None, team_id: int | None = None) -> Dict[str, Any]:
    """Fetch a day's schedule and linescores, optionally filtered by team."""
    params: Dict[str, Any] = {}
    if target_date:
        params["date"] = target_date.strftime("%Y-%m-%d")
    if team_id:
        params["teamId"] = team_id
    params["expand"] = "schedule.linescore"
    data = fetch_json(API_URL, params=params, timeout=10.0)
    rate_limited_sleep(0.5)
    return data


if __name__ == "__main__":
    print(get_schedule())
