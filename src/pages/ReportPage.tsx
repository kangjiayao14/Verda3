import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ChevronLeft,
  Network,
  Download,
  BookOpen,
  Quote,
  Users,
  Calendar,
  Lightbulb,
  Sparkles,
  Link2,
} from 'lucide-react'
import { useReportStore } from '../store/reportStore'
import { VChart } from '../components/VChart'
import { VClaimCard } from '../components/VClaimCard'
import { VSentimentPanel } from '../components/VSentimentPanel'
import { VEvidenceCard } from '../components/VEvidenceFeed'
import { VSkeleton } from '../components/ui'

export default function ReportPage() {
  const { reportId } = useParams()
  const navigate = useNavigate()
  const { current, loading, error, load } = useReportStore()
  const [activeSection, setActiveSection] = useState<string>('')

  useEffect(() => {
    if (reportId) load(reportId)
  }, [reportId, load])

  function jumpTo(id: string) {
    setActiveSection(id)
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  function jumpToEvidence(ids: string[]) {
    if (ids[0]) document.getElementById(`ev-${ids[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-read px-6 py-16">
        <VSkeleton className="h-48 w-full rounded-card" />
        <VSkeleton className="mt-4 h-6 w-2/3" />
        <VSkeleton className="mt-2 h-6 w-1/2" />
      </div>
    )
  }
  if (error || !current) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg text-ink-2">
        <p>{error ?? '报告不存在'}</p>
        <button onClick={() => navigate('/')} className="rounded-btn bg-primary px-5 h-10 text-aux font-medium text-white">
          返回首页
        </button>
      </div>
    )
  }

  const r = current
  // 证据 id → 序号（用于章节级溯源 chips）
  const evIndex = new Map(r.evidence.map((e, i) => [e.evidence_id, i + 1]))

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg">
      {/* 左：目录 TOC */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-card/50 lg:flex">
        <div className="flex h-14 items-center gap-2 border-b border-line px-5">
          <button onClick={() => navigate('/')} className="grid h-8 w-8 place-items-center rounded-btn text-ink-2 hover:bg-primary-tint">
            <ChevronLeft size={18} />
          </button>
          <span className="text-aux font-semibold text-ink">报告目录</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          {r.toc.map((t) => (
            <button
              key={t.id}
              onClick={() => jumpTo(t.id)}
              className={`block w-full rounded-btn px-3 py-2 text-left text-aux transition-colors ${
                activeSection === t.id ? 'bg-primary-tint font-medium text-primary-deep' : 'text-ink-2 hover:bg-primary-tint/50'
              }`}
            >
              {t.title}
            </button>
          ))}
        </nav>
        <div className="border-t border-line p-3">
          <button
            onClick={() => navigate(`/graph/${r.id}`)}
            className="flex w-full items-center justify-center gap-2 rounded-btn bg-primary-tint px-3 h-10 text-aux font-medium text-primary-deep hover:bg-primary-soft/40"
          >
            <Network size={16} /> 知识图谱
          </button>
        </div>
      </aside>

      {/* 中：正文 */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        {/* 杂志封面 */}
        <div className="relative overflow-hidden">
          <img
            src={r.cover_image ?? '/assets/brand/report-cover.png'}
            alt="cover"
            className="h-60 w-full object-cover"
            onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/20 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-serif text-[32px] leading-tight text-white"
            >
              {r.title}
            </motion.h1>
            <p className="mt-2 max-w-2xl text-aux text-white/85">{r.subtitle}</p>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-tag text-white/75">
              <span className="inline-flex items-center gap-1"><Calendar size={13} /> {r.created_at}</span>
              <span className="inline-flex items-center gap-1"><Users size={13} /> {r.experts.length} 位专家</span>
              <span className="inline-flex items-center gap-1"><Quote size={13} /> {r.claims.length} 条结论 · {r.evidence.length} 条证据</span>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="absolute right-6 top-6 inline-flex items-center gap-1.5 rounded-btn bg-card/90 px-3 h-9 text-aux font-medium text-ink-2 backdrop-blur hover:text-primary-deep"
          >
            <Download size={15} /> 导出
          </button>
        </div>

        {/* 正文章节 */}
        <article className="mx-auto max-w-3xl px-6 py-10">
          {r.sections.map((sec) => (
            <section key={sec.id} id={`sec-${sec.id}`} className="mb-12 scroll-mt-6">
              <h2 className="font-serif text-h2 text-ink">{sec.title}</h2>

              {/* 核心判断（结论先行） */}
              {sec.key_takeaway && (
                <div className="mt-3 flex gap-3 rounded-card border-l-[3px] border-primary bg-primary-tint/40 p-4">
                  <Lightbulb size={18} className="mt-0.5 shrink-0 text-primary-deep" />
                  <p className="text-body font-medium text-ink">{sec.key_takeaway}</p>
                </div>
              )}

              <div className="mt-4 space-y-3">
                {sec.paragraphs?.map((p, i) => (
                  <p key={i} className="text-body leading-relaxed text-ink-2">{p}</p>
                ))}
              </div>

              {/* 亮点 / 独特洞察 */}
              {sec.highlights && sec.highlights.length > 0 && (
                <ul className="mt-4 space-y-2 rounded-card bg-card/60 p-4">
                  {sec.highlights.map((h, i) => (
                    <li key={i} className="flex gap-2 text-aux text-ink-2">
                      <Sparkles size={15} className="mt-0.5 shrink-0 text-warn" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* 论点卡 */}
              {sec.claims && sec.claims.length > 0 && (
                <div className="mt-5 space-y-3">
                  {sec.claims.map((c) => (
                    <VClaimCard key={c.claim_id} claim={c} onCite={jumpToEvidence} />
                  ))}
                </div>
              )}

              {/* 图表 */}
              {sec.charts && sec.charts.length > 0 && (
                <div className="mt-5 grid grid-cols-1 gap-4">
                  {sec.charts.map((c) => (
                    <VChart key={c.chart_id} spec={c} onCite={jumpToEvidence} />
                  ))}
                </div>
              )}

              {/* 舆情专章 */}
              {sec.id === 'sentiment' && r.sentiment && (
                <div className="mt-5">
                  <VSentimentPanel sentiment={r.sentiment} />
                </div>
              )}

              {/* 章节级信源溯源 */}
              {sec.source_evidence_ids && sec.source_evidence_ids.length > 0 && (
                <div className="mt-5 flex flex-wrap items-center gap-1.5 border-t border-line/60 pt-3">
                  <span className="inline-flex items-center gap-1 text-tag text-ink-3">
                    <Link2 size={13} /> 本章信源
                  </span>
                  {sec.source_evidence_ids.map((id) => (
                    <button
                      key={id}
                      onClick={() => jumpToEvidence([id])}
                      className="rounded-chip bg-primary-tint px-2 py-0.5 text-tag font-medium text-primary-deep hover:bg-primary-soft/40"
                      title="跳转到该证据"
                    >
                      [{evIndex.get(id) ?? '?'}]
                    </button>
                  ))}
                </div>
              )}
            </section>
          ))}
        </article>
      </main>

      {/* 右：知识库（证据 + 术语表） */}
      <aside className="hidden w-80 shrink-0 flex-col border-l border-line bg-card/50 xl:flex">
        <div className="flex h-14 items-center gap-2 border-b border-line px-5">
          <BookOpen size={16} className="text-primary" />
          <span className="text-aux font-semibold text-ink">知识库</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-3 text-tag font-semibold text-ink-3">证据来源（{r.evidence.length}）</div>
          <div className="flex flex-col gap-2.5">
            {r.evidence.map((ev, i) => (
              <VEvidenceCard key={ev.evidence_id} ev={ev} index={i} />
            ))}
          </div>

          {r.glossary.length > 0 && (
            <>
              <div className="mb-3 mt-6 text-tag font-semibold text-ink-3">术语表</div>
              <div className="flex flex-col gap-2.5">
                {r.glossary.map((g, i) => (
                  <div key={i} className="rounded-card border border-line/60 bg-bg p-3">
                    <div className="text-aux font-semibold text-ink">{g.term}</div>
                    <p className="mt-1 text-tag leading-relaxed text-ink-2">{g.definition}</p>
                    {g.source && <div className="mt-1 text-tag text-primary-deep">— {g.source}</div>}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  )
}
