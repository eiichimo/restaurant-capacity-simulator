import { generateOperationalAdvice } from '../simulation/advice'
import { mean } from '../simulation/statistics'
import type { AnalysisResult, SimulatorConfig } from '../simulation/types'

const round = (value: number, digits = 2) => {
  const scale = 10 ** digits
  return Math.round(value * scale) / scale
}

export function buildChatGptAnalysisPrompt(
  config: SimulatorConfig,
  result: AnalysisResult,
): string {
  const days = result.normalDays
  const average = (selector: (day: (typeof days)[number]) => number) =>
    round(mean(days.map(selector)))
  const advice = generateOperationalAdvice(config, result)
  const analysisData = {
    normalSimulation: {
      trials: config.trials,
      seed: config.seed,
      averageRevenueYen: round(result.summary.averageRevenue),
      medianRevenueYen: round(result.summary.medianRevenue),
      revenueP10Yen: round(result.summary.revenueP10),
      revenueP90Yen: round(result.summary.revenueP90),
      minRevenueYen: round(result.summary.minRevenue),
      maxRevenueYen: round(result.summary.maxRevenue),
      averageArrivedGroups: average((day) => day.arrivedGroups),
      averageArrivedPeople: average((day) => day.arrivedPeople),
      averageAcceptedGroups: average((day) => day.acceptedGroups),
      averageAcceptedPeople: round(result.summary.averageAcceptedPeople),
      averageRejectedPeople: round(result.summary.averageRejectedPeople),
      averageRejectedFullGroups: round(result.summary.averageRejectedFullGroups),
      averageRejectedOversizeGroups: round(result.summary.averageRejectedOversizeGroups),
      averageRejectedLastOrderGroups: round(result.summary.averageRejectedLastOrderGroups),
      averageLostRevenueYen: average((day) => day.lostRevenue),
      averageServiceWaitMinutes: round(result.summary.averageServiceWait),
      averageMaximumServiceWaitMinutes: average((day) => day.maxServiceWait),
      averageStayMinutes: round(result.summary.averageStay),
      tableUtilizationPercent: round(result.summary.averageTableUtilization * 100),
      seatUtilizationPercent: round(result.summary.averageSeatUtilization * 100),
      kitchenUtilizationPercent: round(result.summary.averageKitchenUtilization * 100),
      averageOvertimeMinutes: round(result.summary.averageOvertime),
      averageMaximumKitchenQueue: round(result.summary.averageMaxKitchenQueue),
    },
    saturatedSimulation: {
      averageAcceptedPeople: round(result.saturatedAveragePeople),
      capacityRevenueYen: round(result.capacityRevenue),
      capacityConsumptionPercent: round(result.capacityConsumptionRate * 100),
      note: '1分ごとの来店、平均調理・食事時間、平均客単価による処理能力試算であり、数学的な絶対上限ではない',
    },
    detectedBottlenecks: result.bottlenecks,
    localHypotheses: advice.map(({ title, rationale, experiments, caution }) => ({
      title,
      rationale,
      experiments,
      caution,
    })),
  }

  return `# 飲食店シミュレーション結果の分析依頼

以下はブラウザ内のモンテカルロ・シミュレーション結果です。店舗名・個人情報は含めていません。

## 分析してほしいこと

1. 結果から考えられる主要な制約を、根拠となる数値とともに説明してください。
2. 改善案を優先順位順に示し、それぞれ「変更する入力値」「比較条件」「期待できる変化」「副作用」を記載してください。
3. 一度に複数条件を変えず、効果を検証できる比較シナリオを3〜5個提案してください。
4. このデータだけでは判断できない事項と、実店舗で追加収集すべきデータを挙げてください。
5. 結果を断定せず、シミュレーション上の改善仮説として日本語で回答してください。

## 入力設定

\`\`\`json
${JSON.stringify(config, null, 2)}
\`\`\`

## 集計結果

\`\`\`json
${JSON.stringify(analysisData, null, 2)}
\`\`\`

## モデル上の重要な制約

- 通常卓の相席・卓連結、店内待ち行列、予約を扱わない
- 連続カウンターは同じ列内の隣接席だけをグループ利用でき、別列をまたがない
- メニュー別工程、スタッフ個人差、追加注文、テイクアウトを扱わない
- 来店を時間帯別ポアソン過程、時間と客単価の変動を一様分布で近似している
- 人件費、食材原価、設備費、改装費、光熱費、顧客満足度を扱わない
- 売上キャパシティは数学的な絶対上限ではない
- 提案は経営成果を保証するものではなく、実店舗の制約と費用を踏まえて判断する必要がある
`
}
