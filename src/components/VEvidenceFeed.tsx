import { motion } from 'framer-motion'
import { ExternalLink, FileText } from 'lucide-react'
import type { Evidence } from '../types'

const SOURCE_LABEL: Record<string, string> = {
  douyin: '抖音',
  xiaohongshu: '小红书',
  bilibili: 'B站',
  weibo: '微博',
  zhihu: '知乎',
  official: '官方',
  review: '评测',
}

const SOURCE_CLS: Record<string, string> = {
  douyin: 'bg-ink/10 text-ink',
  xiaohongshu: 'bg-risk/15 text-risk',
  bilibili: 'bg-info/15 text-info',
  weibo: 'bg-warn/15 text-warn',
  zhihu: 'bg-primary-tint text-primary-deep',
  official: 'bg-ok/15 text-ok',
  review: 'bg-sun-soft text-warn',
}

/** 单条证据卡。 */
export function VEvidenceCard({ ev, index }: { ev: Evidence; index?: number }) {
  const label = SOURCE_LABEL[ev.source_type] ?? ev.source_type
  const cls = SOURCE_CLS[ev.source_type] ?? 'bg-primary-tint text-primary-deep'
  return (
    <motion.a
      id={`ev-${ev.evidence_id}`}
      href={ev.source_url}
      target="_blank"
      rel="noreferrer"
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      className="group block rounded-card border border-line/60 bg-card p-3.5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-float"
    >
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center rounded-chip px-2 h-5 text-tag font-medium ${cls}`}>
          {label}
        </span>
        {typeof index === 'number' && (
          <span className="text-tag text-ink-3">#{index + 1}</span>
        )}
        <span className="ml-auto inline-flex items-center gap-1 text-tag text-ink-3">
          可信度 {Math.round(ev.credibility * 100)}%
        </span>
      </div>
      <div className="mt-2 flex items-start gap-1.5">
        <FileText size={14} className="mt-0.5 shrink-0 text-ink-3" />
        <span className="line-clamp-1 text-aux font-medium text-ink">{ev.title}</span>
        <ExternalLink size={13} className="ml-auto shrink-0 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <p className="mt-1.5 line-clamp-2 text-tag leading-relaxed text-ink-2">{ev.excerpt}</p>
    </motion.a>
  )
}

/** 实时证据流。 */
export function VEvidenceFeed({ evidences }: { evidences: Evidence[] }) {
  if (evidences.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-ink-3">
        <FileText size={28} strokeWidth={1.5} />
        <p className="text-aux">证据采集中，稍候片刻……</p>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {evidences.map((ev, i) => (
        <VEvidenceCard key={ev.evidence_id} ev={ev} index={i} />
      ))}
    </div>
  )
}
