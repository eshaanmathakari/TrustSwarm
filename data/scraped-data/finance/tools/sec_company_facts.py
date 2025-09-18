"""Download company fundamentals from SEC's open XBRL API."""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict

BASE_DIR = Path(__file__).resolve().parents[2]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from common import fetch_json, rate_limited_sleep  # type: ignore  # noqa: E402

API_URL = "https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"
USER_AGENT = "TrustSwarmDataCollection/1.0 (contact@example.com)"


def get_company_facts(cik: str) -> Dict[str, Any]:
    url = API_URL.format(cik=cik.zfill(10))
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    data = fetch_json(url, headers=headers, timeout=10.0)
    rate_limited_sleep(0.5)
    return data


if __name__ == "__main__":
    print(list(get_company_facts("320193").keys())[:5])
