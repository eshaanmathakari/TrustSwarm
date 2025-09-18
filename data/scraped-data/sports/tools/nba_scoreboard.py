"""Fetch NBA scoreboard data from NBA's public data feed."""
from __future__ import annotations

import sys
from datetime import date
from pathlib import Path
from typing import Any, Dict

BASE_DIR = Path(__file__).resolve().parents[2]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from common import fetch_json, rate_limited_sleep  # type: ignore  # noqa: E402

API_TEMPLATE = "https://data.nba.com/data/10s/prod/v2/{datestr}/scoreboard.json"


def get_scoreboard(target_date: date | None = None) -> Dict[str, Any]:
    """Return scoreboard data for the given date (defaults to today)."""
    use_date = target_date or date.today()
    url = API_TEMPLATE.format(datestr=use_date.strftime("%Y%m%d"))
    data = fetch_json(url, timeout=10.0)
    rate_limited_sleep(0.5)
    return data


if __name__ == "__main__":
    print(get_scoreboard())
