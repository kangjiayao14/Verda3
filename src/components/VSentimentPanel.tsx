import type { SentimentResult } from '../types'
import { VChart } from './VChart'
import type { ChartSpec } from '../types'

const PLATFORM_LABEL: Record<string, string> = {
  douyin: '抖音',
  xiaohongshu: '小红书',
  bilibili: 'B站',
  weibo: '微博',
  zhihu: '知乎',
}

/** 舆情专章：整体情感条 + 平台分布 + 观点阵营。图表由 section.charts 渲染。 */
export function VSentimentPanel({
  sentiment,
  charts,
}: {
  sentiment: SentimentResult
  charts?: ChartSpec[]
}) {
  const { overall, by_platform, camps, sample_size } = sentiment
  const total = overall.pos + overall.neu + overall.neg || 1
  return (
    <div className="flex flex-col gap-5">
      <div className="text-tag text-ink-3">基于 {sample_size} 条全网评论（抖音优先采集）</div>

      {/* 整体情感条 */}
      <div>
        <div className="mb-1.5 flex items-center justify-between text-tag text-ink-2">
          <span>整体情感倾向</span>
          <span>
            正面 {Math.round((overall.pos / total) * 100)}% · 中性{' '}
            {Math.round((overall.neu / total) * 100)}% · 负面{' '}
            {Math.round((overall.neg / total) * 100)}%
          </span>
        </div>
        <div className="flex h-3 w-full overflow-hidden rounded-chip">
          <div className="bg-ok" style={{ width: `${(overall.pos / total) * 100}%` }} />
          <div className="bg-ink-3/40" style={{ width: `${(overall.neu / total) * 100}%` }} />
          <div className="bg-risk" style={{ width: `${(overall.neg / total) * 100}%` }} />
        </div>
      </div>

      {/* 图表 */}
      {charts && charts.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {charts.map((c) => (
            <VChart key={c.chart_id} spec={c} height={240} />
          ))}
        </div>
      )}

      {/* 平台分布 */}
      <div>
        <div className="mb-2 text-aux font-semibold text-ink">各平台口碑分布</div>
        <div className="flex flex-col gap-2">
          {Object.entries(by_platform).map(([plat, v]) => {
            const t = v.pos + v.neu + v.neg || 1
            return (
              <div key={plat} className="flex items-center gap-3">
                <span className="w-14 shrink-0 text-tag text-ink-2">{PLATFORM_LABEL[plat] ?? plat}</span>
                <div className="flex h-2.5 flex-1 overflow-hidden rounded-chip">
                  <div className="bg-ok" style={{ width: `${(v.pos / t) * 100}%` }} />
                  <div className="bg-ink-3/40" style={{ width: `${(v.neu / t) * 100}%` }} />
                  <div className="bg-risk" style={{ width: `${(v.neg / t) * 100}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 观点阵营 */}
      {camps && camps.length > 0 && (
        <div>
          <div className="mb-2 text-aux font-semibold text-ink">观点阵营</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {camps.map((c, i) => (
              <div key={i} className="rounded-card border border-line/60 bg-bg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-aux font-semibold text-ink">{c.title}</span>
                  <span className="rounded-chip bg-primary-tint px-2.5 h-6 text-tag font-medium text-primary-deep">
                    {Math.round(c.ratio * 100)}%
                  </span>
                </div>
                <p className="mt-1.5 text-tag leading-relaxed text-ink-2">{c.summary}</p>
                {c.quotes?.slice(0, 1).map((q, qi) => (
                  <a
                    key={qi}
                    href={q.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block rounded-btn bg-card px-3 py-2 text-tag italic text-ink-2 hover:text-primary-deep"
                  >
                    “{q.text}”
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
