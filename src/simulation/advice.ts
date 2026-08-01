import type { AnalysisResult, SimulatorConfig } from './types'

export interface OperationalAdvice {
  id: string
  title: string
  rationale: string
  experiments: string[]
  caution: string
}

export const ADVICE_THRESHOLDS = {
  notableOversizeGroups: 0.2,
  longOvertimeMinutes: 20,
  highCapacityConsumption: 0.85,
} as const

const percent = (value: number) => `${(value * 100).toFixed(1)}%`

function addClockMinutes(clock: string, minutes: number): string | undefined {
  const [hoursText, minutesText] = clock.split(':')
  const current = Number(hoursText) * 60 + Number(minutesText)
  const next = current + minutes
  if (!Number.isFinite(current) || next >= 24 * 60) return undefined
  return `${String(Math.floor(next / 60)).padStart(2, '0')}:${String(next % 60).padStart(2, '0')}`
}

function dominantPartySize(config: SimulatorConfig): number {
  let index = 0
  for (let current = 1; current < config.partySizeWeights.length; current += 1) {
    if ((config.partySizeWeights[current] ?? 0) > (config.partySizeWeights[index] ?? 0)) index = current
  }
  return index + 1
}

export function generateOperationalAdvice(
  config: SimulatorConfig,
  result: AnalysisResult,
): OperationalAdvice[] {
  const findings = new Set(result.bottlenecks.map((finding) => finding.kind))
  const advice: OperationalAdvice[] = []

  if (findings.has('厨房制約') || findings.has('複合制約')) {
    advice.push({
      id: 'kitchen',
      title: '厨房能力を1項目ずつ変えて比較する',
      rationale: `厨房稼働率は${percent(result.summary.averageKitchenUtilization)}、平均提供待ちは${result.summary.averageServiceWait.toFixed(1)}分です。厨房側が滞在時間と卓回転を押し上げている可能性があります。`,
      experiments: [
        `同時調理可能人数を${config.kitchen.slots}人分から${config.kitchen.slots + 1}人分へ変更する`,
        `平均調理時間を${config.kitchen.cookMeanMinutes}分から${Math.max(0, Math.round(config.kitchen.cookMeanMinutes * 0.9 * 10) / 10)}分へ10%短縮する`,
        '2条件を同時に変えず、それぞれ同じシード・試行回数で比較する',
      ],
      caution: '設備追加、人員配置、品質への影響や費用はこのモデルに含まれません。',
    })
  }

  if (result.summary.averageRejectedOversizeGroups >= ADVICE_THRESHOLDS.notableOversizeGroups) {
    const maximumCapacity = Math.max(...config.tables.map((table) => table.capacity))
    advice.push({
      id: 'oversize',
      title: '大人数グループの受け入れ方針を比較する',
      rationale: `最大卓定員${maximumCapacity}人を超える離脱が1日平均${result.summary.averageRejectedOversizeGroups.toFixed(1)}組あります。`,
      experiments: [
        '5〜6人を収容できる卓を仮に1卓追加した条件を試す',
        '大人数を受け入れない運営方針の場合は、現状を基準ケースとして維持する',
      ],
      caution: '卓連結を扱わないため、現実に卓を連結できる店舗では離脱を過大評価する場合があります。',
    })
  }

  if (findings.has('座席構成の不一致')) {
    const partySize = dominantPartySize(config)
    advice.push({
      id: 'seating-mix',
      title: '総席数ではなく卓構成を組み替えて比較する',
      rationale: `卓稼働率${percent(result.summary.averageTableUtilization)}に対して実席稼働率は${percent(result.summary.averageSeatUtilization)}です。大きな卓の空席ロスが示唆されます。`,
      experiments: [
        `発生比率が最も高い${partySize}人グループを収容できる小さな卓を増やす`,
        '総席数をなるべく変えず、大卓1卓を小卓へ置き換えた条件を比較する',
      ],
      caution: '通路幅、接客動線、予約需要、卓連結の可否は別途確認が必要です。',
    })
  } else if (findings.has('客席制約') || findings.has('複合制約')) {
    advice.push({
      id: 'tables',
      title: '客席数と卓回転の改善を分けて比較する',
      rationale: `卓稼働率は${percent(result.summary.averageTableUtilization)}、満席離脱は1日平均${result.summary.averageRejectedFullGroups.toFixed(1)}組です。`,
      experiments: [
        '主要なテーブル種別を1卓だけ追加した条件を試す',
        `片付け時間を${config.business.cleanupMinutes}分から${Math.max(0, config.business.cleanupMinutes - 2)}分へ短縮した条件を別に試す`,
      ],
      caution: '増席費用、スタッフ負荷、快適性はシミュレーションに含まれません。',
    })
  }

  if (findings.has('ラストオーダー設定')) {
    const laterLastOrder = addClockMinutes(config.business.lastOrderTime, 30)
    advice.push({
      id: 'last-order',
      title: 'ラストオーダー前後の受付条件を比較する',
      rationale: `LO超過離脱が1日平均${result.summary.averageRejectedLastOrderGroups.toFixed(1)}組あります。来店から注文確定までの${config.business.orderMinutes}分が受付可否へ影響しています。`,
      experiments: [
        laterLastOrder
          ? `ラストオーダーを${config.business.lastOrderTime}から${laterLastOrder}へ30分延長する`
          : 'ラストオーダーを延長できる範囲で比較する',
        `注文確定までの時間を${config.business.orderMinutes}分から${Math.max(0, config.business.orderMinutes - 2)}分へ短縮する`,
      ],
      caution: '営業時間延長による人件費・光熱費と、スタッフの退勤時刻は別途評価してください。',
    })
  }

  if (findings.has('需要不足')) {
    advice.push({
      id: 'demand',
      title: '設備投資の前に需要感度を確認する',
      rationale: `卓稼働率${percent(result.summary.averageTableUtilization)}、厨房稼働率${percent(result.summary.averageKitchenUtilization)}で、設備能力に余裕がある可能性があります。`,
      experiments: [
        '各時間帯の来店組数を10%増やした条件を試す',
        'ピーク時間帯だけ来店組数を20%増やした条件を試す',
      ],
      caution: '販促費、商圏、価格変更による需要変化はモデル化していません。',
    })
  }

  if (result.summary.averageOvertime >= ADVICE_THRESHOLDS.longOvertimeMinutes) {
    advice.push({
      id: 'overtime',
      title: '営業終了後処理を短くする条件を比較する',
      rationale: `最後の卓解放はラストオーダー後、平均${result.summary.averageOvertime.toFixed(1)}分です。退勤時刻への影響が大きい可能性があります。`,
      experiments: [
        '平均調理時間と食事時間をそれぞれ10%短縮した条件を別々に試す',
        'ラストオーダーを15分早めた場合の売上減少と終了時刻短縮を比較する',
      ],
      caution: '食事時間の短縮を実際の接客で強制することは、満足度を損なう可能性があります。',
    })
  }

  if (
    advice.length === 0 ||
    (result.capacityConsumptionRate >= ADVICE_THRESHOLDS.highCapacityConsumption && advice.length < 2)
  ) {
    advice.push({
      id: 'sensitivity',
      title: '1変数ずつ感度分析する',
      rationale: `平均売上のキャパシティ消化率は${percent(result.capacityConsumptionRate)}です。単独で支配的な制約がなくても、条件変更への感度を確認できます。`,
      experiments: [
        '卓数、厨房スロット、平均滞在時間を1項目ずつ±10%変えて比較する',
        '比較時はシードと試行回数を固定する',
      ],
      caution: '複数項目を同時に変えると、どの変更が結果へ寄与したか判断しにくくなります。',
    })
  }

  return advice.slice(0, 6)
}
