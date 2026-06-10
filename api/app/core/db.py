"""SQLite 持久化层（真实落盘，切页面/刷新/重启都在）。

存储：调研任务 / 报告 / 证据溯源 / 竞品监控订阅 / 专家工作量。
所有读写都走这里，绝不再用内存 dict 当真相源。
"""
from __future__ import annotations

import datetime as _dt
import json
import os
import sqlite3
import threading
from pathlib import Path
from typing import Any, Dict, List, Optional


def _resolve_db_path() -> Path:
    """选择数据库落盘位置。

    本地：app/data/verda.db（持久）。
    Vercel：文件系统只读，唯一可写目录是 /tmp（函数生命周期内有效，
    用户已接受刷新/重启后不持久化）。可用 VERDA_DB_PATH 覆盖。
    """
    override = os.environ.get("VERDA_DB_PATH")
    if override:
        return Path(override)
    if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
        return Path("/tmp/verda.db")
    return Path(__file__).resolve().parent.parent / "data" / "verda.db"


_DB_PATH = _resolve_db_path()
_LOCK = threading.Lock()
_conn: Optional[sqlite3.Connection] = None


def _now() -> str:
    return _dt.datetime.now().strftime("%Y-%m-%dT%H:%M:%S")


def _connect() -> sqlite3.Connection:
    global _conn
    if _conn is None:
        _DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        _conn = sqlite3.connect(str(_DB_PATH), check_same_thread=False)
        _conn.row_factory = sqlite3.Row
        _init_schema(_conn)
    return _conn


def _init_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS tasks (
            task_id TEXT PRIMARY KEY,
            query TEXT,
            clarifications TEXT,
            status TEXT,
            created_at TEXT,
            report_id TEXT
        );
        CREATE TABLE IF NOT EXISTS reports (
            report_id TEXT PRIMARY KEY,
            task_id TEXT,
            title TEXT,
            subtitle TEXT,
            query TEXT,
            brands TEXT,
            experts TEXT,
            cover_image TEXT,
            data TEXT,
            evidence_count INTEGER,
            claim_count INTEGER,
            high_conf_count INTEGER,
            created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS evidences (
            evidence_id TEXT PRIMARY KEY,
            report_id TEXT,
            source_url TEXT,
            source_type TEXT,
            domain TEXT,
            title TEXT,
            excerpt TEXT,
            credibility REAL,
            collected_by TEXT,
            brand TEXT,
            captured_at TEXT
        );
        CREATE TABLE IF NOT EXISTS subscriptions (
            sub_id TEXT PRIMARY KEY,
            query TEXT,
            brands TEXT,
            created_at TEXT,
            last_run_at TEXT,
            last_report_id TEXT,
            run_count INTEGER
        );
        CREATE TABLE IF NOT EXISTS expert_stats (
            expert_id TEXT PRIMARY KEY,
            missions INTEGER DEFAULT 0,
            claims_authored INTEGER DEFAULT 0,
            evidence_collected INTEGER DEFAULT 0,
            last_active TEXT
        );
        """
    )
    conn.commit()


# ── 任务 ────────────────────────────────────────────────
def save_task(task_id: str, query: str, clarifications: Dict[str, Any]) -> None:
    with _LOCK:
        c = _connect()
        c.execute(
            "INSERT OR REPLACE INTO tasks(task_id,query,clarifications,status,created_at,report_id)"
            " VALUES(?,?,?,?,?,COALESCE((SELECT report_id FROM tasks WHERE task_id=?),NULL))",
            (task_id, query, json.dumps(clarifications, ensure_ascii=False), "created", _now(), task_id),
        )
        c.commit()


def update_task_clarify(task_id: str, clarifications: Dict[str, Any]) -> None:
    with _LOCK:
        c = _connect()
        c.execute(
            "UPDATE tasks SET clarifications=?, status='clarified' WHERE task_id=?",
            (json.dumps(clarifications, ensure_ascii=False), task_id),
        )
        c.commit()


def get_task(task_id: str) -> Optional[Dict[str, Any]]:
    c = _connect()
    row = c.execute("SELECT * FROM tasks WHERE task_id=?", (task_id,)).fetchone()
    if not row:
        return None
    d = dict(row)
    d["clarifications"] = json.loads(d.get("clarifications") or "{}")
    return d


def mark_task_done(task_id: str, report_id: str) -> None:
    with _LOCK:
        c = _connect()
        c.execute(
            "UPDATE tasks SET status='done', report_id=? WHERE task_id=?",
            (report_id, task_id),
        )
        c.commit()


# ── 报告 + 证据 ─────────────────────────────────────────
def save_report(report: Dict[str, Any], task_id: str = "") -> None:
    evidence = report.get("evidence", [])
    claims = report.get("claims", [])
    high = sum(1 for c in claims if c.get("confidence") == "high")
    with _LOCK:
        c = _connect()
        c.execute(
            "INSERT OR REPLACE INTO reports(report_id,task_id,title,subtitle,query,brands,experts,"
            "cover_image,data,evidence_count,claim_count,high_conf_count,created_at)"
            " VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                report["id"], task_id, report.get("title", ""), report.get("subtitle", ""),
                report.get("query", ""), json.dumps(report.get("brands", []), ensure_ascii=False),
                json.dumps(report.get("experts", []), ensure_ascii=False),
                report.get("cover_image", ""), json.dumps(report, ensure_ascii=False),
                len(evidence), len(claims), high, report.get("created_at", _now()),
            ),
        )
        # 证据溯源单独入库，供全局证据库检索
        for ev in evidence:
            c.execute(
                "INSERT OR REPLACE INTO evidences(evidence_id,report_id,source_url,source_type,"
                "domain,title,excerpt,credibility,collected_by,brand,captured_at)"
                " VALUES(?,?,?,?,?,?,?,?,?,?,?)",
                (
                    ev.get("evidence_id"), report["id"], ev.get("source_url", ""),
                    ev.get("source_type", ""), ev.get("domain", ""), ev.get("title", ""),
                    ev.get("excerpt", "")[:500], ev.get("credibility", 0.0),
                    ev.get("collected_by", ""), ev.get("brand", ""), ev.get("captured_at", _now()),
                ),
            )
        c.commit()


def get_report(report_id: str) -> Optional[Dict[str, Any]]:
    c = _connect()
    row = c.execute("SELECT data FROM reports WHERE report_id=?", (report_id,)).fetchone()
    if not row:
        return None
    return json.loads(row["data"])


def list_reports() -> List[Dict[str, Any]]:
    """报告卡片列表（不含全文 data，省带宽）。"""
    c = _connect()
    rows = c.execute(
        "SELECT report_id,title,subtitle,query,brands,experts,cover_image,"
        "evidence_count,claim_count,high_conf_count,created_at FROM reports ORDER BY created_at DESC"
    ).fetchall()
    out = []
    for r in rows:
        d = dict(r)
        d["id"] = d["report_id"]
        d["brands"] = json.loads(d.get("brands") or "[]")
        d["experts"] = json.loads(d.get("experts") or "[]")
        out.append(d)
    return out


# ── 全局证据溯源库 ──────────────────────────────────────
def query_evidences(
    brand: Optional[str] = None,
    source_type: Optional[str] = None,
    min_cred: float = 0.0,
    limit: int = 200,
) -> List[Dict[str, Any]]:
    c = _connect()
    sql = "SELECT * FROM evidences WHERE credibility>=?"
    args: List[Any] = [min_cred]
    if brand:
        sql += " AND brand=?"
        args.append(brand)
    if source_type:
        sql += " AND source_type=?"
        args.append(source_type)
    sql += " ORDER BY credibility DESC, captured_at DESC LIMIT ?"
    args.append(limit)
    return [dict(r) for r in c.execute(sql, args).fetchall()]


def evidence_facets() -> Dict[str, Any]:
    """证据库聚合：平台分布 / 品牌分布 / 总量。"""
    c = _connect()
    total = c.execute("SELECT COUNT(*) n FROM evidences").fetchone()["n"]
    by_type = {
        r["source_type"]: r["n"]
        for r in c.execute(
            "SELECT source_type, COUNT(*) n FROM evidences GROUP BY source_type"
        ).fetchall()
    }
    by_brand = {
        r["brand"]: r["n"]
        for r in c.execute(
            "SELECT brand, COUNT(*) n FROM evidences WHERE brand!='' GROUP BY brand ORDER BY n DESC LIMIT 12"
        ).fetchall()
    }
    return {"total": total, "by_type": by_type, "by_brand": by_brand}


# ── 调研统计（真实仪表盘）─────────────────────────────────
def dashboard_stats() -> Dict[str, Any]:
    c = _connect()
    reports = c.execute("SELECT COUNT(*) n FROM reports").fetchone()["n"]
    ev_total = c.execute("SELECT COUNT(*) n FROM evidences").fetchone()["n"]
    claim_total = c.execute("SELECT COALESCE(SUM(claim_count),0) n FROM reports").fetchone()["n"]
    high_total = c.execute("SELECT COALESCE(SUM(high_conf_count),0) n FROM reports").fetchone()["n"]
    avg_ev = round(ev_total / reports, 1) if reports else 0
    # 真实事实准确率 = 高置信结论占比
    fact_rate = round(high_total / claim_total * 100) if claim_total else 0
    facets = evidence_facets()
    return {
        "reports": reports,
        "evidence_total": ev_total,
        "claim_total": claim_total,
        "high_conf_total": high_total,
        "avg_evidence_per_report": avg_ev,
        "fact_accuracy": fact_rate,
        "platform_distribution": facets["by_type"],
        "brand_distribution": facets["by_brand"],
    }


# ── 竞品监控订阅 ────────────────────────────────────────
def create_subscription(sub_id: str, query: str, brands: List[str]) -> Dict[str, Any]:
    with _LOCK:
        c = _connect()
        c.execute(
            "INSERT OR REPLACE INTO subscriptions(sub_id,query,brands,created_at,last_run_at,last_report_id,run_count)"
            " VALUES(?,?,?,?,?,?,?)",
            (sub_id, query, json.dumps(brands, ensure_ascii=False), _now(), "", "", 0),
        )
        c.commit()
    return get_subscription(sub_id) or {}


def list_subscriptions() -> List[Dict[str, Any]]:
    c = _connect()
    rows = c.execute("SELECT * FROM subscriptions ORDER BY created_at DESC").fetchall()
    out = []
    for r in rows:
        d = dict(r)
        d["brands"] = json.loads(d.get("brands") or "[]")
        out.append(d)
    return out


def get_subscription(sub_id: str) -> Optional[Dict[str, Any]]:
    c = _connect()
    row = c.execute("SELECT * FROM subscriptions WHERE sub_id=?", (sub_id,)).fetchone()
    if not row:
        return None
    d = dict(row)
    d["brands"] = json.loads(d.get("brands") or "[]")
    return d


def delete_subscription(sub_id: str) -> None:
    with _LOCK:
        c = _connect()
        c.execute("DELETE FROM subscriptions WHERE sub_id=?", (sub_id,))
        c.commit()


def mark_subscription_run(sub_id: str, report_id: str) -> None:
    with _LOCK:
        c = _connect()
        c.execute(
            "UPDATE subscriptions SET last_run_at=?, last_report_id=?, run_count=run_count+1 WHERE sub_id=?",
            (_now(), report_id, sub_id),
        )
        c.commit()


# ── 专家工作量看板 ──────────────────────────────────────
def bump_expert_stats(
    expert_ids: List[str],
    claims_by_author: Optional[Dict[str, int]] = None,
    evidence_by_collector: Optional[Dict[str, int]] = None,
) -> None:
    claims_by_author = claims_by_author or {}
    evidence_by_collector = evidence_by_collector or {}
    ids = set(expert_ids) | set(claims_by_author) | set(evidence_by_collector)
    with _LOCK:
        c = _connect()
        for eid in ids:
            c.execute(
                "INSERT INTO expert_stats(expert_id,missions,claims_authored,evidence_collected,last_active)"
                " VALUES(?,?,?,?,?)"
                " ON CONFLICT(expert_id) DO UPDATE SET"
                " missions=missions+excluded.missions,"
                " claims_authored=claims_authored+excluded.claims_authored,"
                " evidence_collected=evidence_collected+excluded.evidence_collected,"
                " last_active=excluded.last_active",
                (
                    eid,
                    1 if eid in expert_ids else 0,
                    claims_by_author.get(eid, 0),
                    evidence_by_collector.get(eid, 0),
                    _now(),
                ),
            )
        c.commit()


def expert_workload() -> List[Dict[str, Any]]:
    c = _connect()
    rows = c.execute(
        "SELECT * FROM expert_stats ORDER BY missions DESC, claims_authored DESC"
    ).fetchall()
    return [dict(r) for r in rows]
