from __future__ import annotations

import logging
import os
from functools import lru_cache
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import requests
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Load the project's root .env, not a .env inside this package.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

JSEARCH_URL = "https://jsearch.p.rapidapi.com/search-v2"
SERPER_URL = "https://google.serper.dev/search"

JOB_AGGREGATOR_DOMAINS = {
    "linkedin.com", "indeed.com", "glassdoor.com", "naukri.com",
    "foundit.in", "shine.com", "monster.com", "ziprecruiter.com",
    "simplyhired.com", "wellfound.com", "timesjobs.com",
}


def _required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def _jsearch_headers() -> dict[str, str]:
    return {
        "X-RapidAPI-Key": _required_env("RAPIDAPI_KEY"),
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        "Accept": "application/json",
    }


def _serper_headers() -> dict[str, str]:
    return {
        "X-API-KEY": _required_env("SERPER_API_KEY"),
        "Content-Type": "application/json",
    }


def _text(value: Any, default: str = "") -> str:
    if value is None:
        return default
    if isinstance(value, (dict, list)):
        return str(value)
    return str(value).strip() or default


def _normalize_url(url: Any) -> str | None:
    if not isinstance(url, str) or not url.strip():
        return None
    url = url.strip()
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        return None
    return parsed._replace(fragment="").geturl()


def _domain(url: str | None) -> str:
    if not url:
        return ""
    return (urlparse(url).hostname or "").lower().removeprefix("www.")


def _is_job_aggregator(url: str) -> bool:
    domain = _domain(url)
    return any(domain == item or domain.endswith("." + item)
               for item in JOB_AGGREGATOR_DOMAINS)


def _serper_search(query: str, num_results: int = 10) -> dict[str, Any]:
    response = requests.post(
        SERPER_URL,
        headers=_serper_headers(),
        json={"q": query, "num": num_results, "gl": "in", "hl": "en"},
        timeout=30,
    )
    if not response.ok:
        logger.warning("Serper request failed with status %s", response.status_code)
        response.raise_for_status()
    result = response.json()
    if result.get("error"):
        raise RuntimeError("Serper returned an API error.")
    return result


@lru_cache(maxsize=512)
def find_company_website(employer_name: str) -> str | None:
    """Return a likely official company website, not a guaranteed verification."""
    employer_name = (employer_name or "").strip()
    if not employer_name:
        return None

    result = _serper_search(f'"{employer_name}" official website', num_results=10)
    for item in result.get("organic", []):
        link = _normalize_url(item.get("link"))
        if not link or _is_job_aggregator(link):
            continue
        return link
    return None


def search_jobs(
    keyword: str = "Python developer",
    country: str = "in",
    location: str | None = None,
    date_posted: str = "all",
    remote_only: bool = False,
    employment_types: str | None = None,
    job_requirements: str | None = None,
    radius: int | None = None,
    language: str = "en",
    num_pages: int = 1,
    cursor: str | None = None,
    include_company_website: bool = True,
) -> dict[str, Any]:
    """Search jobs and return only the five requested JSON fields per job."""
    if not keyword or not keyword.strip():
        raise ValueError("keyword cannot be empty.")
    if not 1 <= num_pages <= 20:
        raise ValueError("num_pages must be between 1 and 20.")

    params: dict[str, Any] = {
        "query": keyword.strip(),
        "country": country.lower(),
        "date_posted": date_posted,
        "work_from_home": str(remote_only).lower(),
        "num_pages": num_pages,
    }
    optional = {
        "location": location,
        "employment_types": employment_types,
        "job_requirements": job_requirements,
        "radius": radius,
        "language": language,
        "cursor": cursor,
    }
    params.update({k: v for k, v in optional.items() if v is not None and v != ""})

    response = requests.get(
        JSEARCH_URL, headers=_jsearch_headers(), params=params, timeout=60
    )
    if not response.ok:
        logger.warning("JSearch request failed with status %s", response.status_code)
        response.raise_for_status()
    payload = response.json()
    if payload.get("status") == "ERROR":
        raise RuntimeError("JSearch returned an API error.")

    data = payload.get("data", [])
    if isinstance(data, dict):
        raw_jobs = data.get("jobs", [])
        next_cursor = data.get("cursor") or payload.get("cursor")
    elif isinstance(data, list):
        raw_jobs = data
        next_cursor = payload.get("cursor")
    else:
        raw_jobs, next_cursor = [], None

    jobs: list[dict[str, str]] = []
    for raw in raw_jobs:
        employer = _text(raw.get("employer_name"), "Unknown employer")
        website = None
        if include_company_website and employer != "Unknown employer":
            try:
                website = find_company_website(employer)
            except Exception:
                # Keep the job result if company enrichment fails.
                logger.exception("Company website lookup failed for employer=%s", employer)

        jobs.append({
            "job_title": _text(raw.get("job_title"), "Untitled"),
            "employer_name": employer,
            "job_location": _text(raw.get("job_location"), "Not specified"),
            "job_description": _text(raw.get("job_description"), ""),
            "company_website": website or "",
        })

    return {
        "success": True,
        "count": len(jobs),
        "jobs": jobs,
        "next_cursor": next_cursor,
    }
