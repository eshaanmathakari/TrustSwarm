"""Scrape headline summaries from Reuters Markets page."""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Dict, List

from bs4 import BeautifulSoup

BASE_DIR = Path(__file__).resolve().parents[2]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from common import fetch_text, rate_limited_sleep  # type: ignore  # noqa: E402

URL = "https://www.reuters.com/markets/"


def get_headlines(limit: int = 12) -> List[Dict[str, str]]:
    html = fetch_text(URL)
    rate_limited_sleep(0.5)
    soup = BeautifulSoup(html, "html.parser")
    articles = []
    for card in soup.select("article.story-card")[:limit]:
        title_el = card.find("h3")
        link_el = card.find("a", href=True)
        summary_el = card.find("p")
        articles.append({
            "title": title_el.text.strip() if title_el else "",
            "link": f"https://www.reuters.com{link_el['href']}" if link_el else "",
            "summary": summary_el.text.strip() if summary_el else "",
        })
    return articles


if __name__ == "__main__":
    print(get_headlines()[:3])
