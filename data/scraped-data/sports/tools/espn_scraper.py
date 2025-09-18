"""Scraper for ESPN scoreboards."""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict, List

from bs4 import BeautifulSoup

BASE_DIR = Path(__file__).resolve().parents[2]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from common import fetch_text  # type: ignore  # noqa: E402

SCOREBOARD_URL = "https://www.espn.com/nba/scoreboard"


def parse_scoreboard(html: str) -> List[Dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    games = []
    for game in soup.select("article.scoreboard"):
        header = game.select_one("div.scoreboard-header")
        status = (header.select_one(".game-status span") if header else None)
        teams = game.select("tbody tr")
        if len(teams) != 2:
            continue
        home = teams[1]
        away = teams[0]
        def extract_team(row):
            name = row.select_one("span.sb-team-short") or row.select_one("span.sb-team-short")
            score = row.select_one("td.total").text.strip() if row.select_one("td.total") else None
            return {
                "name": name.text.strip() if name else None,
                "score": int(score) if score and score.isdigit() else None,
            }
        games.append({
            "status": status.text.strip() if status else None,
            "home": extract_team(home),
            "away": extract_team(away),
        })
    return games


def get_scoreboard() -> List[Dict[str, Any]]:
    html = fetch_text(SCOREBOARD_URL)
    return parse_scoreboard(html)


if __name__ == "__main__":
    print(get_scoreboard())
