"""豆包 LLM 客户端封装（Doubao-Seed-2.0-lite，走 Ark OpenAI 兼容网关）。

- EP / APIKEY 走环境变量，不硬编码、不外泄（第 16.4 章）。
- 支持普通 chat 与流式 chat（供思维流 SSE 使用）。
- 未配置 key 时抛出明确错误，由上层决定是否走 demo 兜底。
"""
from __future__ import annotations

import json
import re
from typing import Any, Iterator, Optional

from openai import OpenAI

from app.core.config import get_settings


class LLMNotConfigured(RuntimeError):
    """未配置 ARK_API_KEY。"""


_client: OpenAI | None = None

# 进程级 token 计数（供 progress 真实上报）
TOKEN_USAGE = {"total": 0}


def _get_client() -> OpenAI:
    global _client
    settings = get_settings()
    if not settings.ark_api_key:
        raise LLMNotConfigured(
            "未配置 ARK_API_KEY，请在 backend/.env 中填写火山方舟 API Key。"
        )
    if _client is None:
        _client = OpenAI(
            api_key=settings.ark_api_key,
            base_url=settings.ark_base_url,
        )
    return _client


def chat(
    messages: list[dict],
    temperature: float = 0.6,
    max_tokens: int = 2048,
) -> str:
    """一次性返回完整回复文本。"""
    settings = get_settings()
    client = _get_client()
    resp = client.chat.completions.create(
        model=settings.doubao_endpoint_id,
        messages=messages,  # type: ignore[arg-type]
        temperature=temperature,
        max_tokens=max_tokens,
    )
    try:
        if resp.usage:
            TOKEN_USAGE["total"] += int(resp.usage.total_tokens or 0)
    except Exception:
        pass
    return resp.choices[0].message.content or ""


def chat_json(
    messages: list[dict],
    temperature: float = 0.3,
    max_tokens: int = 2048,
) -> Optional[Any]:
    """要求 LLM 输出 JSON，解析为对象；失败返回 None（调用方决定是否重试）。"""
    raw = chat(messages, temperature=temperature, max_tokens=max_tokens)
    return _extract_json(raw)


def _extract_json(text: str) -> Optional[Any]:
    if not text:
        return None
    # 去掉 ```json 围栏
    fenced = re.search(r"```(?:json)?\s*(.+?)```", text, re.S)
    if fenced:
        text = fenced.group(1)
    # 优先尝试整体解析
    try:
        return json.loads(text)
    except Exception:
        pass
    # 退而求其次：抓第一个 { } 或 [ ]
    for pat in (r"\[.*\]", r"\{.*\}"):
        m = re.search(pat, text, re.S)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:
                continue
    return None


def chat_stream(
    messages: list[dict],
    temperature: float = 0.6,
    max_tokens: int = 2048,
) -> Iterator[str]:
    """流式返回文本增量（供思维流逐条 append）。"""
    settings = get_settings()
    client = _get_client()
    stream = client.chat.completions.create(
        model=settings.doubao_endpoint_id,
        messages=messages,  # type: ignore[arg-type]
        temperature=temperature,
        max_tokens=max_tokens,
        stream=True,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta
