"""Scrape real-time quote data from Yahoo Finance public endpoint."""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict

BASE_DIR = Path(__file__).resolve().parents[2]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from common import fetch_json, rate_limited_sleep  # type: ignore  # noqa: E402

API_URL = "https://query1.finance.yahoo.com/v7/finance/quote"


def get_quote(symbol: str) -> Dict[str, Any]:
    params = {"symbols": symbol}
    data = fetch_json(API_URL, params=params, timeout=10.0)
    rate_limited_sleep(0.5)
    quotes = data.get("quoteResponse", {}).get("result", [])
    return quotes[0] if quotes else {}


if __name__ == "__main__":
    print(get_quote("AAPL"))
