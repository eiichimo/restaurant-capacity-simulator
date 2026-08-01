import { describe, expect, it } from 'vitest'
import type { SummaryStatistics } from './types'
import { BOTTLENECK_THRESHOLDS, detectBottlenecks } from './bottleneck'

function summary(overrides: Partial<SummaryStatistics> = {}): SummaryStatistics {
  return {
    averageRevenue: 0,
    medianRevenue: 0,
    revenueP10: 0,
    revenueP90: 0,
    minRevenue: 0,
    maxRevenue: 0,
    averageAcceptedPeople: 0,
    averageRejectedPeople: 0,
    averageTableUtilization: 0.6,
    averageSeatUtilization: 0.55,
    averageKitchenUtilization: 0.6,
    averageServiceWait: 10,
    averageStay: 0,
    averageOvertime: 0,
    averageRejectedFullGroups: 0,
    averageRejectedOversizeGroups: 0,
    averageRejectedLastOrderGroups: 0,
    averageMaxKitchenQueue: 0,
    ...overrides,
  }
}

const kinds = (value: SummaryStatistics) => detectBottlenecks(value).map((finding) => finding.kind)

describe('ボトルネック判定', () => {
  it('低稼働かつ離脱が少なければ需要不足と判定する', () => {
    expect(kinds(summary({ averageTableUtilization: 0.2, averageKitchenUtilization: 0.2 }))).toContain('需要不足')
  })

  it('閾値以上の卓稼働または満席離脱で客席制約と判定する', () => {
    expect(kinds(summary({ averageTableUtilization: BOTTLENECK_THRESHOLDS.highTableUtilization }))).toContain('客席制約')
    expect(kinds(summary({ averageRejectedFullGroups: 2 }))).toContain('客席制約')
  })

  it('卓と実席の乖離および満席離脱から座席構成不一致を判定する', () => {
    expect(kinds(summary({ averageTableUtilization: 0.8, averageSeatUtilization: 0.5, averageRejectedFullGroups: 0.1 }))).toContain('座席構成の不一致')
  })

  it('厨房高稼働または長い提供待ちで厨房制約と判定する', () => {
    expect(kinds(summary({ averageKitchenUtilization: BOTTLENECK_THRESHOLDS.highKitchenUtilization }))).toContain('厨房制約')
    expect(kinds(summary({ averageServiceWait: 20 }))).toContain('厨房制約')
  })

  it('客席と厨房の双方が高ければ複合制約と判定する', () => {
    expect(kinds(summary({ averageTableUtilization: 0.8, averageKitchenUtilization: 0.8 }))).toContain('複合制約')
  })

  it('LO超過の件数または離脱内の割合からLO設定を判定する', () => {
    expect(kinds(summary({ averageRejectedLastOrderGroups: 2 }))).toContain('ラストオーダー設定')
    expect(kinds(summary({ averageRejectedFullGroups: 4, averageRejectedLastOrderGroups: 1 }))).toContain('ラストオーダー設定')
  })

  it('いずれの閾値にも該当しなければ明確な制約なしとする', () => {
    expect(kinds(summary())).toEqual(['明確な制約なし'])
  })
})
