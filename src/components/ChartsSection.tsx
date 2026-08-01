import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
  type ChartOptions,
} from 'chart.js'
import { useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import type { AnalysisResult } from '../simulation/types'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

interface Props {
  result: AnalysisResult
}

const yen = (value: number) => `${Math.round(value).toLocaleString('ja-JP')}円`

const commonOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true } },
}

export function ChartsSection({ result }: Props) {
  const histogram = useMemo(() => {
    const revenues = result.normalDays.map((day) => day.revenue)
    const min = Math.min(...revenues)
    const max = Math.max(...revenues)
    const binCount = 12
    const width = Math.max(1, (max - min) / binCount)
    const counts = Array.from({ length: binCount }, () => 0)
    revenues.forEach((revenue) => {
      const index = Math.min(binCount - 1, Math.floor((revenue - min) / width))
      counts[index] = (counts[index] ?? 0) + 1
    })
    return {
      labels: counts.map((_, index) => `${Math.round(min + index * width).toLocaleString('ja-JP')}円〜`),
      counts,
    }
  }, [result])

  const summaryBars = [
    result.summary.averageRevenue,
    result.summary.revenueP10,
    result.summary.medianRevenue,
    result.summary.revenueP90,
    result.capacityRevenue,
  ]
  const rejectedBars = [
    result.summary.averageRejectedFullGroups,
    result.summary.averageRejectedOversizeGroups,
    result.summary.averageRejectedLastOrderGroups,
  ]
  const utilizationBars = [
    result.summary.averageTableUtilization * 100,
    result.summary.averageSeatUtilization * 100,
    result.summary.averageKitchenUtilization * 100,
  ]

  return (
    <section className="charts-section" aria-labelledby="charts-heading">
      <div className="section-heading dark-heading"><span>DATA</span><div><h2 id="charts-heading">グラフ</h2><p>主要な分布と能力差を視覚化します。各グラフの下に同内容の数値を記載しています。</p></div></div>
      <div className="charts-grid">
        <figure className="chart-card">
          <figcaption><h3>売上分布</h3><p>通常シミュレーションのヒストグラム</p></figcaption>
          <div className="chart-canvas"><Bar aria-label="売上分布のヒストグラム" role="img" options={commonOptions} data={{ labels: histogram.labels, datasets: [{ label: '試行日数', data: histogram.counts, backgroundColor: '#e89a52' }] }} /></div>
          <details><summary>数値で確認</summary><ul className="plain-list">{histogram.labels.map((label, index) => <li key={label}>{label}: {histogram.counts[index]}回</li>)}</ul></details>
        </figure>
        <figure className="chart-card">
          <figcaption><h3>売上指標の比較</h3><p>通常需要の統計と飽和需要キャパシティ</p></figcaption>
          <div className="chart-canvas"><Bar aria-label="平均売上、下位10%、中央値、上位10%、売上キャパシティの比較" role="img" options={commonOptions} data={{ labels: ['平均', '下位10%', '中央値', '上位10%', 'キャパシティ'], datasets: [{ label: '円', data: summaryBars, backgroundColor: ['#4e8b78', '#84ae9f', '#2f6d5c', '#1d5144', '#e89a52'] }] }} /></div>
          <p className="chart-text">平均 {yen(summaryBars[0] ?? 0)} ／ 下位10% {yen(summaryBars[1] ?? 0)} ／ 中央値 {yen(summaryBars[2] ?? 0)} ／ 上位10% {yen(summaryBars[3] ?? 0)} ／ キャパシティ {yen(summaryBars[4] ?? 0)}</p>
        </figure>
        <figure className="chart-card">
          <figcaption><h3>離脱理由別</h3><p>1営業日あたりの平均離脱組数</p></figcaption>
          <div className="chart-canvas"><Bar aria-label="離脱理由別の平均組数" role="img" options={commonOptions} data={{ labels: ['満席', '最大収容人数超過', 'LO超過'], datasets: [{ label: '組', data: rejectedBars, backgroundColor: ['#c86452', '#b78b63', '#8a6b83'] }] }} /></div>
          <p className="chart-text">満席 {rejectedBars[0]?.toFixed(1)}組 ／ 最大収容人数超過 {rejectedBars[1]?.toFixed(1)}組 ／ LO超過 {rejectedBars[2]?.toFixed(1)}組</p>
        </figure>
        <figure className="chart-card">
          <figcaption><h3>稼働率の比較</h3><p>客席リソース・実席・厨房の平均稼働率</p></figcaption>
          <div className="chart-canvas"><Bar aria-label="客席リソース稼働率、実席稼働率、厨房稼働率の比較" role="img" options={{ ...commonOptions, scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (value) => `${value}%` } } } }} data={{ labels: ['客席リソース', '実席', '厨房'], datasets: [{ label: '%', data: utilizationBars, backgroundColor: ['#2f6d5c', '#77a493', '#e89a52'] }] }} /></div>
          <p className="chart-text">客席リソース {utilizationBars[0]?.toFixed(1)}% ／ 実席 {utilizationBars[1]?.toFixed(1)}% ／ 厨房 {utilizationBars[2]?.toFixed(1)}%</p>
        </figure>
      </div>
    </section>
  )
}
