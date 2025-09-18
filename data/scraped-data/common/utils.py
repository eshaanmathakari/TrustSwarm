"""Shared utilities for scraping/API clients."""
from __future__ import annotations

import os
import time
from typing import Any, Dict, Optional

import requests


class APIError(Exception):
    """Raised when an API call fails."""


def get_env(name: str, default: Optional[str] = None, required: bool = False) -> Optional[str]:
    """Helper to read environment variables with optional requirement."""
    value = os.getenv(name, default)
    if required and not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def _check_response(response: requests.Response) -> None:
    if response.status_code >= 400:
        raise APIError(
            f"Request failed ({response.status_code}) for {response.url}: {response.text[:200]}"
        )


def fetch_json(url: str, *, headers: Optional[Dict[str, str]] = None,
               params: Optional[Dict[str, Any]] = None,
               timeout: float = 10.0) -> Dict[str, Any]:
    """Perform an HTTP GET and return parsed JSON, raising on HTTP errors."""
    response = requests.get(url, headers=headers, params=params, timeout=timeout)
    _check_response(response)
    return response.json()


def fetch_text(url: str, *, headers: Optional[Dict[str, str]] = None,
               params: Optional[Dict[str, Any]] = None,
               timeout: float = 10.0) -> str:
    """Perform an HTTP GET and return response text."""
    response = requests.get(url, headers=headers, params=params, timeout=timeout)
    _check_response(response)
    return response.text


def post_json(url: str, *, headers: Optional[Dict[str, str]] = None,
              json_body: Optional[Dict[str, Any]] = None,
              timeout: float = 10.0) -> Dict[str, Any]:
    """Perform an HTTP POST with a JSON body and return parsed JSON."""
    response = requests.post(url, headers=headers, json=json_body, timeout=timeout)
    _check_response(response)
    return response.json()


def rate_limited_sleep(min_seconds: float) -> None:
    """Simple helper to pause between API calls when rate limiting is strict."""
    time.sleep(max(0.0, min_seconds))
