# 青野 Verda · AI 竞品情报工作台

> 让每个结论都有出处，让每次调研都活着。

一个会自己组队、能溯源、看得见思考过程的「AI 竞品情报工作台」。

- **前端**：React 18 + TypeScript + Vite + TailwindCSS + Zustand + Framer Motion + ECharts / React Flow
- **后端**：FastAPI + LangGraph + SQLite
- **LLM**：豆包 Doubao-Seed-2.0-lite（火山方舟 / Ark OpenAI 兼容网关）

## 目录结构

```
.
├── frontend/             # React + Vite 前端
│   ├── src/
│   │   ├── components/   # 通用组件（V 前缀组件库）
│   │   ├── layout/       # AppLayout / VSidebar 全局框架
│   │   ├── pages/        # 8 个页面
│   │   ├── store/        # Zustand 状态
│   │   ├── hooks/        # 自定义 hooks（含 SSE）
│   │   └── lib/api.ts    # 后端 API 封装
│   └── public/assets/    # 静态资源（头像、品牌图等）
├── backend/              # FastAPI + LangGraph 后端
│   ├── app/
│   │   ├── core/         # config / llm / search / fetcher / orchestrator / db ...
│   │   ├── data/         # 专家清单等静态数据
│   │   └── main.py       # FastAPI 入口
│   ├── requirements.txt
│   └── .env.example      # 环境变量模板（密钥走环境变量，不硬编码）
├── .gitignore
└── README.md
```

## 环境要求

- Node.js ≥ 18（推荐 22.x）
- Python ≥ 3.9

## 快速开始

### 1. 克隆仓库

```bash
git clone <your-repo-url>
cd <repo>
```

### 2. 配置后端密钥

```bash
cd backend
cp .env.example .env
# 编辑 .env，填入自己的 ARK_API_KEY / SERPAPI_KEY 等
```

| 变量 | 说明 | 必填 |
|---|---|---|
| `ARK_API_KEY` | 火山方舟 API Key（豆包） | 是（LLM 真实调用） |
| `DOUBAO_ENDPOINT_ID` | 推理接入点 ID | 是 |
| `SERPAPI_KEY` / `BING_SEARCH_KEY` | 搜索 API（采集 Agent） | 采集真实联网时需要 |
| `DOUYIN_COOKIE` / `BILIBILI_COOKIE` / `XHS_COOKIE` | 各平台采集 cookie | 平台采集时需要 |

> ⚠️ `.env` 已在 `.gitignore` 中，**严禁**把真实密钥提交到 GitHub。

### 3. 启动后端

```bash
cd backend
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m uvicorn app.main:app --reload --port 8000
# http://localhost:8000
```

验证 LLM 是否打通：

```bash
curl http://localhost:8000/api/llm/ping
curl http://localhost:8000/health
```

### 4. 启动前端

```bash
cd frontend
npm install
npm run dev
# http://localhost:5173
```

如需自定义后端地址，可在 `frontend/.env.local` 中设置：

```
VITE_API_BASE=http://localhost:8000
```

## 部署到 Vercel

仓库根目录已经准备好 Vercel 所需配置：

| 文件 | 作用 |
|---|---|
| [vercel.json](file:///Users/bytedance/Documents/trae_projects/2nd_副本7/vercel.json) | 指定构建命令、输出目录、`/api/*` 与 `/health` rewrite 到 Python Serverless |
| [package.json](file:///Users/bytedance/Documents/trae_projects/2nd_副本7/package.json) | 根目录 `build` 脚本，调用 `frontend` 子项目构建 |
| [requirements.txt](file:///Users/bytedance/Documents/trae_projects/2nd_副本7/requirements.txt) | Vercel Python runtime 依赖 |
| [api/index.py](file:///Users/bytedance/Documents/trae_projects/2nd_副本7/api/index.py) | Serverless 入口（暴露 `app` ASGI 应用） |
| [api/app/](file:///Users/bytedance/Documents/trae_projects/2nd_副本7/api/app) | 与 `backend/app` 完全一致的副本，供 Serverless 引用 |

### 1. 在 Vercel 控制台 Import 仓库

- **Framework Preset**：`Other`
- **Root Directory**：`/`（根目录）
- **Build Command**：`npm run build`（或留空，由 `vercel.json` 提供）
- **Output Directory**：`frontend/dist`（同上）
- **Install Command**：保留 vercel.json 中的 `echo 'skip root install'`，避免根目录无 lock 文件时报错

### 2. 配置环境变量（Project Settings → Environment Variables）

按 [backend/.env.example](file:///Users/bytedance/Documents/trae_projects/2nd_副本7/backend/.env.example) 中的 key 添加：

| Key | 必填 |
|---|---|
| `ARK_API_KEY` | 是 |
| `DOUBAO_ENDPOINT_ID` | 是 |
| `ARK_BASE_URL` | 否（默认即可） |
| `SERPAPI_KEY` / `BING_SEARCH_KEY` | 采集联网时填 |
| `DOUYIN_COOKIE` / `BILIBILI_COOKIE` / `XHS_COOKIE` | 平台采集时填 |
| `ENABLE_DEMO_FALLBACK` | 可选，默认 `true` |

### 3. 路由说明

- `/`、`/assets/*` → 静态前端（`frontend/dist`）
- `/api/*`、`/health` → Python Serverless（`api/index.py`）

> ⚠️ Vercel Serverless 文件系统只读，SQLite 仅写入 `/tmp`，重启即丢；如需持久化请接入外部数据库（如 Supabase / PlanetScale）。

### 4. CLI 部署（可选）

```bash
npm i -g vercel
vercel link
vercel --prod
```

---

## 安全提示

- 仓库中的 `backend/.env.example` 仅含占位符，请勿在该文件填入真实密钥后提交。
- `backend/.env`、`*.env`、`.venv/`、`node_modules/`、`dist/`、运行时 SQLite 等已通过 `.gitignore` 忽略。
- 若误提交了密钥，请立刻在对应平台吊销 / 轮换，并清理 git 历史。

## License

仅作个人作品 / 学习用途。
