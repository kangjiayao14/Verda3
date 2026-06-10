"""Vercel Python Serverless 入口。

Vercel 把函数代码放在 /var/task/api/index.py，需要把当前目录加入 sys.path
才能 import 到同级的 app/ 包。
"""
from __future__ import annotations

import os
import sys

_API_DIR = os.path.dirname(os.path.abspath(__file__))
if _API_DIR not in sys.path:
    sys.path.insert(0, _API_DIR)

from app.main import app  # noqa: E402,F401  Vercel 通过 `app` 变量识别 ASGI 应用
