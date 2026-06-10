"""通用搜索采集（第 16 章）。

- 主用 SerpAPI（有 key 时），支持 Google / 站内 site 搜索等。
- multi_search：一次跑多条查询并按 URL 去重，用于深度调研多角度检索。
- 尽力而为：单条查询失败不抛断，返回已得结果。
"""
from __future__ import annotations

import datetime as _dt
from typing import List, Optional

import httpx

from app.core.config import get_settings

SERPAPI_ENDPOINT = "https://serpapi.com/search.json"
_TIMEOUT = httpx.Timeout(connect=8, read=25, write=5, pool=5)


def _now() -> str:
    return _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def search_serpapi(
    query: str,
    *,
    num: int = 10,
    site: Optional[str] = None,
) -> list[dict]:
    """用 SerpAPI 做网页搜索。

    - `site`: 可选，形如 "douyin.com" / "zhihu.com"，限定域名。
    - 返回的每条都带 url + snippet + source，便于后续抓取正文。
    """
    settings = get_settings()
    if not settings.serpapi_key:
        raise RuntimeError("未配置 SERPAPI_KEY，搜索暂不可用")

    params = {
        "q": f"site:{site} {query}" if site else query,
        "api_key": settings.serpapi_key,
        "num": str(num),
        "engine": "google",
        "google_domain": "google.com",
        "gl": "cn",
        "hl": "zh-cn",
    }

    with httpx.Client(timeout=_TIMEOUT, follow_redirects=True) as client:
        r = client.get(SERPAPI_ENDPOINT, params=params)
        r.raise_for_status()
        data = r.json()

    results: list[dict] = []
    for item in data.get("organic_results", []):
        results.append(
            {
                "title": item.get("title", ""),
                "url": item.get("link", ""),
                "snippet": item.get("snippet", ""),
                "source": item.get("source") or item.get("displayed_link", ""),
                "position": item.get("position"),
                "captured_at": _now(),
            }
        )
    # 有时 SerpAPI 会返回 knowledge_graph，顺手收一点
    kg = data.get("knowledge_graph") or {}
    if kg and "title" in kg:
        results.append(
            {
                "title": f"[Knowledge] {kg.get('title', '')}",
                "url": kg.get("website", ""),
                "snippet": "；".join(
                    v for k, v in kg.items()
                    if k in {"description", "type", "industries", "headquarters", "ceo"}
                    and isinstance(v, str)
                ),
                "source": "knowledge_graph",
                "captured_at": _now(),
            }
        )
    return results


def search(query: str, *, num: int = 10, site: Optional[str] = None) -> list[dict]:
    """对外入口：SerpAPI 搜索。失败抛给上层处理。"""
    return search_serpapi(query, num=num, site=site)


def multi_search(
    queries: List[str],
    *,
    num: int = 10,
    site: Optional[str] = None,
) -> list[dict]:
    """跑多条查询，按 URL 去重聚合。单条失败跳过（尽力而为）。"""
    seen: set[str] = set()
    out: list[dict] = []
    for q in queries:
        try:
            for r in search(q, num=num, site=site):
                url = r.get("url", "")
                key = url or r.get("title", "")
                if not key or key in seen:
                    continue
                seen.add(key)
                r["query"] = q
                out.append(r)
        except Exception:
            continue
    return out
