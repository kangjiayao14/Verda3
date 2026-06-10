import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowUp,
  Paperclip,
  ChevronDown,
  Cpu,
  Sparkles,
  Car,
  ShieldCheck,
  Layers,
  TrendingUp,
  Sprout,
} from 'lucide-react'
import { fadeUp, stagger, VSunGlow } from '../components/ui'
import { useUIStore } from '../store/uiStore'
import { useExpertStore } from '../store/expertStore'
import { createTask } from '../lib/api'

const MODELS = ['Auto', 'GLM-4.7-FlashX', 'DeepSeek-V4-Pro', 'Kimi-2.5', 'Doubao-Seed-2.0-lite']

const EXAMPLES = [
  {
    icon: Car,
    title: '新能源车竞争格局',
    desc: '分析特斯拉、比亚迪、理想的产品与定价竞争定位',
    q: '分析特斯拉、比亚迪、理想在新能源车市场的产品力与定价竞争格局',
  },
  {
    icon: ShieldCheck,
    title: '竞品 SWOT 分析',
    desc: '为飞书、钉钉、企业微信生成结构化 SWOT 对比',
    q: '为飞书、钉钉、企业微信做一份结构化 SWOT 竞争分析',
  },
  {
    icon: Layers,
    title: '功能对标基准',
    desc: '横向对比 Notion / 飞书 / Obsidian 的核心功能',
    q: '横向对比 Notion、飞书文档、Obsidian 的核心功能与定价',
  },
  {
    icon: TrendingUp,
    title: '市场趋势报告',
    desc: '梳理 2026 年 AI 笔记赛道的关键趋势',
    q: '梳理 2026 年 AI 笔记 / 知识管理赛道的关键趋势与代表玩家',
  },
]

function ModelPicker() {
  const [open, setOpen] = useState(false)
  const { model, setModel } = useUIStore()
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="切换分析模型"
        className="inline-flex items-center gap-1.5 px-3 h-9 rounded-chip bg-primary-tint text-primary-deep text-aux font-medium hover:bg-primary-soft/40 transition-colors"
      >
        <Cpu size={15} />
        <span className="max-w-[120px] truncate">{model === 'Auto' ? '切换模型' : model}</span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-11 right-0 z-20 w-56 rounded-btn bg-card shadow-float border border-line p-1">
            <div className="px-3 pb-1 pt-1.5 text-tag text-ink-3">选择分析模型</div>
            {MODELS.map((m) => (
              <button
                key={m}
                onClick={() => {
                  setModel(m)
                  setOpen(false)
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 h-9 text-aux transition-colors hover:bg-primary-tint ${
                  model === m ? 'text-primary-deep font-medium' : 'text-ink-2'
                }`}
              >
                {m === 'Auto' ? 'Auto（智能编排）' : m}
                {m === 'Auto' && <span className="text-tag text-ink-3">默认</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const experts = useExpertStore((s) => s.experts)
  const wall = experts.slice(0, 14)

  async function submit(q: string) {
    const query = q.trim()
    if (!query || submitting) return
    setSubmitting(true)
    try {
      const resp = await createTask(query)
      if (resp.needClarify) navigate(`/clarify/${resp.taskId}`, { state: { query, clarify: resp.clarifyQuestions } })
      else navigate(`/workspace/${resp.taskId}`, { state: { query } })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-full overflow-hidden">
      {/* 叶影暖阳氛围层 */}
      <div
        className="pointer-events-none absolute inset-0 -z-0 opacity-[0.5]"
        style={{
          backgroundImage: 'url(/assets/brand/hero-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'right top',
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1), rgba(0,0,0,0) 70%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1), rgba(0,0,0,0) 70%)',
        }}
      />
      <VSunGlow className="opacity-40" />

      {/* 顶部右上：what's new + 头像 */}
      <div className="relative z-10 flex items-center justify-between px-8 pt-6">
        <span className="inline-flex items-center gap-1.5 rounded-chip border border-line bg-card/80 px-3 h-9 text-aux text-ink-2 backdrop-blur">
          <Sparkles size={14} className="text-primary" /> 新功能上线
        </span>
        <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-aux font-semibold text-white">
          研
        </span>
      </div>

      {/* Hero 主体 */}
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-80px)] max-w-[820px] flex-col items-center justify-center px-6 pb-20">
        <motion.h1
          variants={fadeUp}
          initial="initial"
          animate="animate"
          className="text-center font-serif text-[44px] leading-tight text-ink"
        >
          下午好，林研究员
          <span className="ml-2 inline-block align-middle">
            <Sprout className="inline text-primary" size={34} />
          </span>
        </motion.h1>
        <motion.p
          variants={fadeUp}
          initial="initial"
          animate="animate"
          className="mt-3 text-lg text-ink-2"
        >
          你的 AI 竞品分析 Agent —— 48 位专家协作，无证据不立论
        </motion.p>

        {/* 大输入框 */}
        <motion.div
          variants={fadeUp}
          initial="initial"
          animate="animate"
          className="mt-9 w-full rounded-card border-2 border-transparent bg-card p-4 shadow-float transition-all focus-within:border-primary focus-within:shadow-glow"
        >
          <textarea
            ref={taRef}
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(text)
            }}
            placeholder="想分析哪个市场、公司或竞争策略？例如：分析 Notion / 飞书 / Obsidian 的产品与定价竞争格局"
            className="w-full resize-none bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-tag text-ink-3">48 位专家 · 真实联网 · 无证据不立论</span>
            <div className="flex items-center gap-2">
              <ModelPicker />
              <button
                title="上传附件"
                className="grid h-9 w-9 place-items-center rounded-full text-ink-3 transition-colors hover:bg-primary-tint hover:text-primary-deep"
              >
                <Paperclip size={18} />
              </button>
              <button
                onClick={() => submit(text)}
                disabled={!text.trim() || submitting}
                className="grid h-11 w-11 place-items-center rounded-full bg-primary text-white shadow-card transition-all hover:scale-105 hover:bg-primary-deep active:scale-95 disabled:opacity-40 disabled:hover:scale-100"
              >
                <ArrowUp size={20} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* 示例卡 */}
        <p className="mt-9 text-aux text-ink-3">试试这些示例</p>
        <motion.div
          variants={stagger}
          initial="initial"
          animate="animate"
          className="mt-4 grid w-full grid-cols-2 gap-4 sm:grid-cols-4"
        >
          {EXAMPLES.map((ex) => (
            <motion.button
              key={ex.title}
              variants={fadeUp}
              onClick={() => submit(ex.q)}
              className="group flex flex-col rounded-card border border-line/60 bg-card/80 p-4 text-left shadow-card backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-float"
            >
              <span className="grid h-9 w-9 place-items-center rounded-btn bg-primary-tint text-primary">
                <ex.icon size={18} />
              </span>
              <span className="mt-3 text-aux font-semibold text-ink">{ex.title}</span>
              <span className="mt-1 text-tag leading-relaxed text-ink-3">{ex.desc}</span>
            </motion.button>
          ))}
        </motion.div>

        {/* 专家墙 */}
        <div className="mt-12 flex w-full flex-col items-center">
          <div className="flex items-center -space-x-2">
            {wall.map((e, i) => (
              <img
                key={e.id}
                src={e.avatar}
                alt={e.name}
                title={`${e.name} · ${e.role_title}`}
                className="h-9 w-9 rounded-full border-2 border-card object-cover shadow-card"
                style={{ zIndex: wall.length - i }}
              />
            ))}
            <button
              onClick={() => navigate('/experts')}
              className="z-0 ml-1 inline-flex h-9 items-center rounded-chip bg-primary-tint px-3 text-tag font-medium text-primary-deep hover:bg-primary-soft/40"
            >
              查看全部 48 位 →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
