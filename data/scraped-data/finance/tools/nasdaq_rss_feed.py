"""Parse latest stock market headlines from Nasdaq RSS feed."""
from __future__ import annotations

import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, List

BASE_DIR = Path(__file__).resolve().parents[2]
if str(BASE_DIR) not in sys.path:
    sys.path.append(str(BASE_DIR))

from common import fetch_text, rate_limited_sleep  # type: ignore  # noqa: E402

RSS_URL = "https://www.nasdaq.com/feed/rssoutbound?category=Stock-Market-News"


def get_headlines(limit: int = 10) -> List[Dict[str, str]]:
    xml_text = fetch_text(RSS_URL)
    rate_limited_sleep(0.5)
    root = ET.fromstring(xml_text)
    items = []
    for item in root.findall("channel/item")[:limit]:
        title = item.findtext("title", default="")
        link = item.findtext("link", default="")
        pub_date = item.findtext("pubDate", default="")
        summary = item.findtext("description", default="")
        items.append({
            "title": title.strip(),
            "link": link.strip(),
            "published": pub_date.strip(),
            "summary": summary.strip(),
        })
    return items


if __name__ == "__main__":
    print(get_headlines()[:3])
