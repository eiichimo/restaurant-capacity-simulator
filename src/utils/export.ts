import type { AnalysisResult, DayResult, SimulatorConfig } from '../simulation/types'

function downloadBlob(content: string, mimeType: string, filename: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export function downloadConfig(config: SimulatorConfig): void {
  downloadBlob(
    `${JSON.stringify(config, null, 2)}\n`,
    'application/json;charset=utf-8',
    'restaurant-simulator-settings.json',
  )
}

const CSV_COLUMNS: Array<[string, keyof DayResult]> = [
  ['試行', 'revenue'],
  ['売上', 'revenue'],
  ['来店組数', 'arrivedGroups'],
  ['来店人数', 'arrivedPeople'],
  ['受入組数', 'acceptedGroups'],
  ['受入人数', 'acceptedPeople'],
  ['満席離脱組数', 'rejectedFullGroups'],
  ['定員超過離脱組数', 'rejectedOversizeGroups'],
  ['LO超過離脱組数', 'rejectedLastOrderGroups'],
  ['機会損失額', 'lostRevenue'],
  ['平均提供待ち分', 'averageServiceWait'],
  ['最大提供待ち分', 'maxServiceWait'],
  ['平均滞在分', 'averageStay'],
  ['最大滞在分', 'maxStay'],
  ['卓稼働率', 'tableUtilization'],
  ['実席稼働率', 'seatUtilization'],
  ['厨房稼働率', 'kitchenUtilization'],
  ['営業終了後処理分', 'overtimeMinutes'],
  ['最大厨房待ちジョブ数', 'maxKitchenQueue'],
]

export function downloadResultsCsv(result: AnalysisResult): void {
  const headers = CSV_COLUMNS.map(([header]) => header)
  const lines = result.normalDays.map((day, index) =>
    CSV_COLUMNS.map(([, key], column) => (column === 0 ? index + 1 : day[key])).join(','),
  )
  downloadBlob(
    `\uFEFF${[headers.join(','), ...lines].join('\n')}\n`,
    'text/csv;charset=utf-8',
    'restaurant-simulation-results.csv',
  )
}
