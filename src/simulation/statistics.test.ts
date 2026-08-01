import { describe, expect, it } from 'vitest'
import type { DayResult } from './types'
import { mean, percentile, summarizeDays } from './statistics'

function day(overrides: Partial<DayResult>): DayResult {
  return {
    revenue: 0,
    arrivedGroups: 0,
    arrivedPeople: 0,
    acceptedGroups: 0,
    acceptedPeople: 0,
    rejectedFullGroups: 0,
    rejectedFullPeople: 0,
    rejectedOversizeGroups: 0,
    rejectedOversizePeople: 0,
    rejectedLastOrderGroups: 0,
    rejectedLastOrderPeople: 0,
    lostRevenue: 0,
    averageServiceWait: 0,
    maxServiceWait: 0,
    averageStay: 0,
    maxStay: 0,
    tableUtilization: 0,
    seatUtilization: 0,
    kitchenUtilization: 0,
    overtimeMinutes: 0,
    maxKitchenQueue: 0,
    ...overrides,
  }
}

describe('統計関数', () => {
  it('平均値を計算する', () => {
    expect(mean([10, 20, 30, 40])).toBe(25)
    expect(mean([])).toBe(0)
  })

  it('中央値とパーセンタイルを線形補間で計算する', () => {
    expect(percentile([40, 10, 30, 20], 0.5)).toBe(25)
    expect(percentile([0, 100], 0.1)).toBe(10)
    expect(percentile([0, 100], 0.9)).toBe(90)
  })

  it('範囲外のパーセンタイルを端値へ収め、入力配列を変更しない', () => {
    const values = [30, 10, 20]
    expect(percentile(values, -1)).toBe(10)
    expect(percentile(values, 2)).toBe(30)
    expect(values).toEqual([30, 10, 20])
  })

  it('複数営業日の全サマリー項目を営業日単位で平均する', () => {
    const result = summarizeDays([
      day({
        revenue: 1000,
        acceptedPeople: 2,
        rejectedFullPeople: 1,
        tableUtilization: 0.2,
        seatUtilization: 0.1,
        kitchenUtilization: 0.3,
        averageServiceWait: 10,
        averageStay: 30,
        overtimeMinutes: 5,
        rejectedFullGroups: 1,
        maxKitchenQueue: 2,
      }),
      day({
        revenue: 3000,
        acceptedPeople: 6,
        rejectedOversizePeople: 2,
        rejectedLastOrderPeople: 1,
        tableUtilization: 0.6,
        seatUtilization: 0.5,
        kitchenUtilization: 0.7,
        averageServiceWait: 20,
        averageStay: 50,
        overtimeMinutes: 15,
        rejectedOversizeGroups: 1,
        rejectedLastOrderGroups: 1,
        maxKitchenQueue: 4,
      }),
    ])

    expect(result).toEqual({
      averageRevenue: 2000,
      medianRevenue: 2000,
      revenueP10: 1200,
      revenueP90: 2800,
      minRevenue: 1000,
      maxRevenue: 3000,
      averageAcceptedPeople: 4,
      averageRejectedPeople: 2,
      averageTableUtilization: 0.4,
      averageSeatUtilization: 0.3,
      averageKitchenUtilization: 0.5,
      averageServiceWait: 15,
      averageStay: 40,
      averageOvertime: 10,
      averageRejectedFullGroups: 0.5,
      averageRejectedOversizeGroups: 0.5,
      averageRejectedLastOrderGroups: 0.5,
      averageMaxKitchenQueue: 3,
    })
  })
})
