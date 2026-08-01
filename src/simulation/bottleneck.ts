import type { BottleneckFinding, SummaryStatistics } from './types'

export const BOTTLENECK_THRESHOLDS = {
  lowUtilization: 0.45,
  highTableUtilization: 0.8,
  highKitchenUtilization: 0.8,
  seatingMismatchGap: 0.2,
  longServiceWaitMinutes: 20,
  manyRejectedGroups: 2,
  lastOrderShare: 0.15,
} as const

export function detectBottlenecks(summary: SummaryStatistics): BottleneckFinding[] {
  const t = BOTTLENECK_THRESHOLDS
  const totalRejectedGroups =
    summary.averageRejectedFullGroups +
    summary.averageRejectedOversizeGroups +
    summary.averageRejectedLastOrderGroups
  const tableHigh =
    summary.averageTableUtilization >= t.highTableUtilization ||
    summary.averageRejectedFullGroups >= t.manyRejectedGroups
  const kitchenHigh =
    summary.averageKitchenUtilization >= t.highKitchenUtilization ||
    summary.averageServiceWait >= t.longServiceWaitMinutes
  const findings: BottleneckFinding[] = []

  if (tableHigh && kitchenHigh) {
    findings.push({
      kind: '複合制約',
      message: '客席と厨房の双方が高稼働で、複数の能力が同時に制約となっている可能性があります。',
    })
  }
  if (tableHigh) {
    findings.push({
      kind: '客席制約',
      message: '満席離脱または卓稼働率が高く、客席能力が主要な制約になっている可能性があります。',
    })
  }
  if (
    summary.averageTableUtilization - summary.averageSeatUtilization >= t.seatingMismatchGap &&
    summary.averageRejectedFullGroups > 0
  ) {
    findings.push({
      kind: '座席構成の不一致',
      message: '総席数ではなく、卓の定員構成による空席ロスが発生している可能性があります。',
    })
  }
  if (kitchenHigh) {
    findings.push({
      kind: '厨房制約',
      message: '厨房稼働率または提供待ちが大きく、厨房能力が主要な制約になっている可能性があります。',
    })
  }
  if (
    summary.averageRejectedLastOrderGroups >= t.manyRejectedGroups ||
    (totalRejectedGroups > 0 && summary.averageRejectedLastOrderGroups / totalRejectedGroups >= t.lastOrderShare)
  ) {
    findings.push({
      kind: 'ラストオーダー設定',
      message: '注文確定がラストオーダーを越える離脱が相対的に多く、時刻設定の影響が示唆されます。',
    })
  }
  if (
    summary.averageTableUtilization < t.lowUtilization &&
    summary.averageKitchenUtilization < t.lowUtilization &&
    totalRejectedGroups < t.manyRejectedGroups
  ) {
    findings.push({
      kind: '需要不足',
      message: '現状では設備能力より来店需要が売上を制約している可能性があります。',
    })
  }
  if (findings.length === 0) {
    findings.push({
      kind: '明確な制約なし',
      message: '今回の条件では、単独で支配的なボトルネックは見つかりませんでした。',
    })
  }
  return findings
}
