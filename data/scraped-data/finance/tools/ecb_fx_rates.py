"""Fetch daily EUR FX reference rates from the European Central Bank."""
from __future__ import annotations

import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict

BASE_DIR = Path(__file__).resolve().parents[2]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from common import fetch_text, rate_limited_sleep  # type: ignore  # noqa: E402

API_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"


def get_latest_rates() -> Dict[str, float]:
    xml_text = fetch_text(API_URL)
    rate_limited_sleep(0.5)
    root = ET.fromstring(xml_text)
    namespace = "{http://www.ecb.int/vocabulary/2002-08-01/eurofxref}"
    # Rates are stored in Cube elements under the first Cube child
    rates: Dict[str, float] = {}
    for cube in root.findall(f".//{namespace}Cube/{namespace}Cube/{namespace}Cube"):
        currency = cube.get("currency")
        rate = cube.get("rate")
        if currency and rate:
            rates[currency] = float(rate)
    return rates


if __name__ == "__main__":
    print(get_latest_rates())
