"""Fetch historical EOD prices from Stooq (public CSV feed)."""
from __future__ import annotations

import csv
import io
import sys
from pathlib import Path
from typing import Dict, List

BASE_DIR = Path(__file__).resolve().parents[2]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from common import fetch_text, rate_limited_sleep  # type: ignore  # noqa: E402

URL_TEMPLATE = "https://stooq.com/q/d/l/?s={symbol}&i=d"


def get_eod_prices(symbol: str) -> List[Dict[str, str]]:
    """Download EOD price data for the given Stooq symbol (e.g. aapl.us)."""
    csv_text = fetch_text(URL_TEMPLATE.format(symbol=symbol.lower()))
    reader = csv.DictReader(io.StringIO(csv_text))
    rows = [row for row in reader]
    rate_limited_sleep(0.5)
    return rows


if __name__ == "__main__":
    print(get_eod_prices("aapl.us")[:5])
