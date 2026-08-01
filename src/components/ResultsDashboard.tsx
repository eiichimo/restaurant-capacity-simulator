import { mean } from '../simulation/statistics'
import type { AnalysisResult } from '../simulation/types'

interface Props {
  result: AnalysisResult
  onDownloadCsv: () => void
}

const yen = (value: number) => `${Math.round(value).toLocaleString('ja-JP')}円`
const minutes = (value: number) => `${value.toFixed(1)}分`
const percent = (value: number) => `${(value * 100).toFixed(1)}%`
const number = (value: number) => value.toFixed(1)

interface MetricProps {
  label: string
  value: string
  emphasized?: boolean
}

function Metric({ label, value, emphasized }: MetricProps) {
  return (
    <div className={`metric${emphasized ? ' metric-primary' : ''}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

export function ResultsDashboard({ result, onDownloadCsv }: Props) {
  const { summary } = result
  const days = result.normalDays
  const average = (selector: (day: (typeof days)[number]) => number) => mean(days.map(selector))
  return (
    <section className="results-section" aria-labelledby="results-heading">
      <div className="results-title-row">
        <div>
          <p className="eyebrow">SIMULATION RESULT</p>
          <h2 id="results-heading" tabIndex={-1}>結果サマリー</h2>
        </div>
        <button className="button secondary light-button" type="button" onClick={onDownloadCsv}>結果CSVをダウンロード</button>
      </div>
      <dl className="metrics-grid headline-metrics">
        <Metric label="平均売上" value={yen(summary.averageRevenue)} emphasized />
        <Metric label="売上キャパシティ" value={yen(result.capacityRevenue)} emphasized />
        <Metric label="キャパシティ消化率" value={percent(result.capacityConsumptionRate)} emphasized />
        <Metric label="平均受け入れ人数" value={`${number(summary.averageAcceptedPeople)}人`} />
      </dl>
      <p className="capacity-note">売上キャパシティは、1分ごとの飽和需要・平均時間・平均客単価という指定条件下での処理能力試算です。数学的に保証された絶対上限ではありません。</p>

      <h3>売上統計</h3>
      <dl className="metrics-grid">
        <Metric label="下位10%点" value={yen(summary.revenueP10)} />
        <Metric label="中央値" value={yen(summary.medianRevenue)} />
        <Metric label="上位10%点" value={yen(summary.revenueP90)} />
        <Metric label="最小売上" value={yen(summary.minRevenue)} />
        <Metric label="最大売上" value={yen(summary.maxRevenue)} />
        <Metric label="平均機会損失額" value={yen(average((day) => day.lostRevenue))} />
      </dl>

      <h3>処理量・離脱</h3>
      <dl className="metrics-grid">
        <Metric label="平均来店組数" value={`${number(average((day) => day.arrivedGroups))}組`} />
        <Metric label="平均来店人数" value={`${number(average((day) => day.arrivedPeople))}人`} />
        <Metric label="平均受け入れ組数" value={`${number(average((day) => day.acceptedGroups))}組`} />
        <Metric label="平均離脱人数" value={`${number(summary.averageRejectedPeople)}人`} />
        <Metric label="満席離脱" value={`${number(summary.averageRejectedFullGroups)}組`} />
        <Metric label="最大収容人数超過" value={`${number(summary.averageRejectedOversizeGroups)}組`} />
        <Metric label="LO超過" value={`${number(summary.averageRejectedLastOrderGroups)}組`} />
        <Metric label="飽和時の受入人数" value={`${number(result.saturatedAveragePeople)}人`} />
      </dl>

      <h3>時間・稼働</h3>
      <dl className="metrics-grid">
        <Metric label="平均提供待ち" value={minutes(summary.averageServiceWait)} />
        <Metric label="平均最大提供待ち" value={minutes(average((day) => day.maxServiceWait))} />
        <Metric label="平均滞在時間" value={minutes(summary.averageStay)} />
        <Metric label="平均最大滞在時間" value={minutes(average((day) => day.maxStay))} />
        <Metric label="客席リソース稼働率" value={percent(summary.averageTableUtilization)} />
        <Metric label="実席稼働率" value={percent(summary.averageSeatUtilization)} />
        <Metric label="厨房稼働率" value={percent(summary.averageKitchenUtilization)} />
        <Metric label="営業終了後処理" value={minutes(summary.averageOvertime)} />
        <Metric label="平均最大厨房待ち" value={`${number(summary.averageMaxKitchenQueue)}ジョブ`} />
      </dl>
    </section>
  )
}
