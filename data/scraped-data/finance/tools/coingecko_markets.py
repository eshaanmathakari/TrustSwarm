"""Fetch cryptocurrency market data from the public CoinGecko API."""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict, List

BASE_DIR = Path(__file__).resolve().parents[2]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from common import fetch_json, rate_limited_sleep  # type: ignore  # noqa: E402

API_URL = "https://api.coingecko.com/api/v3/coins/markets"


def get_markets(vs_currency: str = "usd", per_page: int = 20) -> List[Dict[str, Any]]:
    params = {
        "vs_currency": vs_currency,
        "order": "market_cap_desc",
        "per_page": per_page,
        "page": 1,
        "sparkline": "false",
        "price_change_percentage": "24h",
    }
    data = fetch_json(API_URL, params=params, timeout=10.0)
    rate_limited_sleep(1.0)
    return data


if __name__ == "__main__":
    print(get_markets()[:3])
