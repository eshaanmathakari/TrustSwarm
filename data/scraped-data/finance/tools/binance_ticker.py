"""Fetch 24hr ticker statistics from Binance public API."""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict

BASE_DIR = Path(__file__).resolve().parents[2]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from common import fetch_json, rate_limited_sleep  # type: ignore  # noqa: E402

API_URL = "https://api.binance.com/api/v3/ticker/24hr"


def get_ticker(symbol: str = "BTCUSDT") -> Dict[str, Any]:
    params = {"symbol": symbol.upper()}
    data = fetch_json(API_URL, params=params, timeout=10.0)
    rate_limited_sleep(0.5)
    return data


if __name__ == "__main__":
    print(get_ticker())
