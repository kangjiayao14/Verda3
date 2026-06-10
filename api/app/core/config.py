"""全局配置：从环境变量 / .env 读取，不硬编码密钥（第 16.4 章）。"""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # LLM（豆包 / Ark OpenAI 兼容）
    ark_api_key: str = ""
    doubao_endpoint_id: str = "ep-20260514111325-xjmj7"
    ark_base_url: str = "https://ark.cn-beijing.volces.com/api/v3"

    # 搜索 API
    serpapi_key: str = ""
    bing_search_key: str = ""

    # 平台采集
    douyin_cookie: str = ""
    xhs_cookie: str = ""
    bilibili_cookie: str = ""

    # 服务
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    frontend_origin: str = "http://localhost:5173"
    enable_demo_fallback: bool = True

    @property
    def llm_configured(self) -> bool:
        return bool(self.ark_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
