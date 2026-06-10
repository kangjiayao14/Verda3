"""真实网页抓取（第 5 章 通用采集）。

- httpx 拉取 HTML → trafilatura 抽正文 → BeautifulSoup 抽图片。
- 失败降级：返回 snippet 占位，trace 标 degraded，绝不抛断流程。
"""
from __future__ import annotations

import datetime as _dt
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin, urlparse

import httpx

_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)
_TIMEOUT = httpx.Timeout(connect=8, read=20, write=5, pool=5)


def _now() -> str:
    return _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def domain_of(url: str) -> str:
    try:
        return urlparse(url).netloc.lower().replace("www.", "")
    except Exception:
        return ""


def fetch_page(url: str, *, fallback_snippet: str = "") -> Dict[str, Any]:
    """抓取单页正文 + 图片。返回 {text, images, ok, degraded}。"""
    result: Dict[str, Any] = {
        "url": url,
        "text": fallback_snippet,
        "images": [],
        "ok": False,
        "degraded": True,
    }
    try:
        with httpx.Client(
            timeout=_TIMEOUT,
            follow_redirects=True,
            headers={"User-Agent": _UA, "Accept-Language": "zh-CN,zh;q=0.9"},
        ) as client:
            r = client.get(url)
            r.raise_for_status()
            html = r.text

        text = _extract_text(html) or fallback_snippet
        images = _extract_images(html, url)
        result.update(
            {"text": text[:4000], "images": images[:6], "ok": True, "degraded": False}
        )
    except Exception:
        # 降级保留 snippet
        pass
    result["captured_at"] = _now()
    return result


def _extract_text(html: str) -> str:
    try:
        import trafilatura

        out = trafilatura.extract(html, include_comments=False, include_tables=False)
        if out:
            return out.strip()
    except Exception:
        pass
    # 退而求其次：BeautifulSoup 抓段落
    try:
        from bs4 import BeautifulSoup

        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        ps = [p.get_text(" ", strip=True) for p in soup.find_all("p")]
        return "\n".join(p for p in ps if len(p) > 20)
    except Exception:
        return ""


def _extract_images(html: str, base_url: str) -> List[Dict[str, str]]:
    out: List[Dict[str, str]] = []
    try:
        from bs4 import BeautifulSoup

        soup = BeautifulSoup(html, "html.parser")
        for img in soup.find_all("img"):
            src = img.get("src") or img.get("data-src") or ""
            if not src or src.startswith("data:"):
                continue
            full = urljoin(base_url, src)
            alt = (img.get("alt") or "").strip()
            out.append({"src": full, "alt": alt, "source_url": base_url})
            if len(out) >= 8:
                break
    except Exception:
        pass
    return out
