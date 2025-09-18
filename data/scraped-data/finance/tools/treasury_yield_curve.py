"""Retrieve US Treasury yield curve data from data.treasury.gov OData feed."""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict, List

BASE_DIR = Path(__file__).resolve().parents[2]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from common import fetch_json, rate_limited_sleep  # type: ignore  # noqa: E402

API_URL = "https://data.treasury.gov/feed.svc/DailyTreasuryYieldCurveRateData"


def get_recent_entries(limit: int = 30) -> List[Dict[str, Any]]:
    params = {"$top": limit, "$format": "json"}
    data = fetch_json(API_URL, params=params, timeout=10.0)
    rate_limited_sleep(0.5)
    return data.get("value", [])


if __name__ == "__main__":
    print(get_recent_entries()[:2])
