import type { AnalysisResult } from '../simulation/types'

export function BottleneckPanel({ result }: { result: AnalysisResult }) {
  return (
    <section className="panel bottleneck-panel" aria-labelledby="bottleneck-heading">
      <div className="section-heading"><span>!</span><div><h2 id="bottleneck-heading">ボトルネック分析</h2><p>閾値に基づく簡易判定です。断定ではなく改善仮説としてご利用ください。</p></div></div>
      <div className="findings">
        {result.bottlenecks.map((finding) => (
          <article key={finding.kind} className="finding">
            <h3>{finding.kind}</h3>
            <p>{finding.message}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
