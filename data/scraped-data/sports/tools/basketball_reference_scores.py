"""Scrape NBA game summaries from Basketball Reference."""
from __future__ import annotations

import sys
from datetime import date
from pathlib import Path
from typing import Any, Dict, List

from bs4 import BeautifulSoup

BASE_DIR = Path(__file__).resolve().parents[2]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from common import fetch_text  # type: ignore  # noqa: E402

URL_TEMPLATE = "https://www.basketball-reference.com/boxscores/?month={month}&day={day}&year={year}"


def get_daily_boxscores(target_date: date | None = None) -> List[Dict[str, Any]]:
    use_date = target_date or date.today()
    url = URL_TEMPLATE.format(month=use_date.month, day=use_date.day, year=use_date.year)
    html = fetch_text(url)
    soup = BeautifulSoup(html, "html.parser")
    games: List[Dict[str, Any]] = []
    for game in soup.select("div.game_summary"):
        teams = game.select("table.teams tbody tr")
        if len(teams) != 2:
            continue
        info = game.find("div", class_="game_info")
        meta = info.text.strip() if info else ""
        def parse_team(row):
            name = row.find("a")
            score = row.find("td", class_="right")
            return {
                "name": name.text.strip() if name else None,
                "score": int(score.text.strip()) if score and score.text.strip().isdigit() else None,
            }
        games.append({
            "home": parse_team(teams[1]),
            "away": parse_team(teams[0]),
            "meta": meta,
        })
    return games


if __name__ == "__main__":
    print(get_daily_boxscores()[:3])
