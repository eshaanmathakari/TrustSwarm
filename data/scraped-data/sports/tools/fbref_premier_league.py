"""Scrape Premier League fixtures and results from FBref."""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict, List

from bs4 import BeautifulSoup

BASE_DIR = Path(__file__).resolve().parents[2]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from common import fetch_text  # type: ignore  # noqa: E402

URL_TEMPLATE = (
    "https://fbref.com/en/comps/9/{season}/schedule/{season}-Premier-League-Scores-and-Fixtures"
)


def get_fixtures(season: str = "2023-2024") -> List[Dict[str, Any]]:
    """Return fixtures/results for the given Premier League season."""
    season_slug = season.replace("/", "-")
    html = fetch_text(URL_TEMPLATE.format(season=season_slug))
    soup = BeautifulSoup(html, "html.parser")
    table_id = f"sched_{season_slug}_9"
    table = soup.find("table", id=table_id)
    if table is None or table.tbody is None:
        raise RuntimeError("Could not locate fixtures table; site layout may have changed.")
    results: List[Dict[str, Any]] = []
    for row in table.tbody.find_all("tr"):
        if row.get("class") == ["thead"]:
            continue
        match_date = row.find("th", {"data-stat": "date"})
        if match_date is None:
            continue
        home = row.find("td", {"data-stat": "home_team"})
        away = row.find("td", {"data-stat": "away_team"})
        score = row.find("td", {"data-stat": "score"})
        venue = row.find("td", {"data-stat": "venue"})
        results.append({
            "date": match_date.text.strip(),
            "home": home.text.strip() if home else None,
            "away": away.text.strip() if away else None,
            "score": score.text.strip() if score else None,
            "venue": venue.text.strip() if venue else None,
        })
    return results


if __name__ == "__main__":
    print(get_fixtures()[:5])
