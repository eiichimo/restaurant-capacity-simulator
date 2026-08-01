import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../presets'
import {
  chooseSmallestAvailableTable,
  normalizePartySizeWeights,
  runAnalysis,
  simulateDay,
  simulateDayDetailed,
} from './engine'
import { mulberry32 } from './random'
import type { SimulatorConfig } from './types'

function testConfig(): SimulatorConfig {
  const config = structuredClone(DEFAULT_CONFIG)
  config.business = {
    openTime: '10:00',
    lastOrderTime: '11:00',
    orderMinutes: 0,
    checkoutMinutes: 0,
    cleanupMinutes: 0,
  }
  config.tables = [{ id: 'only', name: '2人卓', capacity: 2, count: 1 }]
  config.arrivalPeriods = [{ id: 'all', startTime: '10:00', endTime: '11:00', groupsPerHour: 4 }]
  config.partySizeWeights = [0, 100, 0, 0, 0, 0]
  config.kitchen = {
    slots: 1,
    cookMeanMinutes: 10,
    cookVariationMinutes: 0,
    diningMeanMinutes: 5,
    diningVariationMinutes: 0,
    waitForAllMeals: false,
  }
  config.pricing = { meanPerPerson: 1000, variation: 0 }
  config.seed = 123
  config.trials = 100
  return config
}

describe('乱数と到着分布', () => {
  it('同じ設定とシードで同じ結果になる', () => {
    const first = runAnalysis(testConfig())
    const second = runAnalysis(testConfig())
    expect(second).toEqual(first)
  })

  it('異なるシードで通常結果が変化する', () => {
    const firstConfig = testConfig()
    const secondConfig = testConfig()
    secondConfig.seed += 1
    expect(runAnalysis(secondConfig).normalDays).not.toEqual(runAnalysis(firstConfig).normalDays)
  })

  it('グループ人数比率を合計1へ正規化する', () => {
    expect(normalizePartySizeWeights([10, 20, 30, 0, 0, 0])).toEqual([
      1 / 6,
      1 / 3,
      1 / 2,
      0,
      0,
      0,
    ])
    expect(() => normalizePartySizeWeights([0, 0, 0, 0, 0, 0])).toThrow()
  })
})

describe('卓の割り当てと離脱', () => {
  it('空いている最小収容可能卓を選ぶ', () => {
    const index = chooseSmallestAvailableTable(
      [
        { capacity: 4, availableAt: 0 },
        { capacity: 2, availableAt: 0 },
        { capacity: 1, availableAt: 0 },
      ],
      2,
      0,
    )
    expect(index).toBe(1)
  })

  it('着席可能な卓が使用中なら満席離脱する', () => {
    const { day, traces } = simulateDayDetailed(testConfig(), mulberry32(1), {
      arrivals: [
        { time: 0, partySize: 2 },
        { time: 1, partySize: 2 },
      ],
    })
    expect(day.acceptedGroups).toBe(1)
    expect(day.rejectedFullGroups).toBe(1)
    expect(traces[1]?.outcome).toBe('full')
  })

  it('最大卓定員を超えるグループは離脱する', () => {
    const { day, traces } = simulateDayDetailed(testConfig(), mulberry32(1), {
      arrivals: [{ time: 0, partySize: 3 }],
    })
    expect(day.rejectedOversizeGroups).toBe(1)
    expect(traces[0]?.outcome).toBe('oversize')
  })

  it('注文確定がラストオーダーを超えると離脱する', () => {
    const config = testConfig()
    config.business.orderMinutes = 10
    const { day, traces } = simulateDayDetailed(config, mulberry32(1), {
      arrivals: [{ time: 55, partySize: 2 }],
    })
    expect(day.rejectedLastOrderGroups).toBe(1)
    expect(traces[0]?.outcome).toBe('lastOrder')
  })

  it('注文確定がラストオーダーと同時刻なら受け付ける', () => {
    const config = testConfig()
    config.business.orderMinutes = 5
    const { day, traces } = simulateDayDetailed(config, mulberry32(1), {
      arrivals: [{ time: 55, partySize: 2 }],
    })
    expect(day.acceptedGroups).toBe(1)
    expect(day.rejectedLastOrderGroups).toBe(0)
    expect(traces[0]?.outcome).toBe('accepted')
  })

  it('卓が解放された時刻と同時刻の来店を受け付ける', () => {
    const config = testConfig()
    config.partySizeWeights = [100, 0, 0, 0, 0, 0]
    const { day, traces } = simulateDayDetailed(config, mulberry32(1), {
      arrivals: [
        { time: 0, partySize: 1 },
        { time: 14, partySize: 1 },
        { time: 15, partySize: 1 },
      ],
    })
    expect(traces.map((trace) => trace.outcome)).toEqual(['accepted', 'full', 'accepted'])
    expect(day.acceptedGroups).toBe(2)
  })
})

describe('厨房と卓解放時刻', () => {
  it('厨房スロット数によって提供時刻が変わる', () => {
    const oneSlot = testConfig()
    const twoSlots = testConfig()
    twoSlots.kitchen.slots = 2
    const arrival = { arrivals: [{ time: 0, partySize: 2 }] }
    const one = simulateDayDetailed(oneSlot, mulberry32(1), arrival).traces[0]
    const two = simulateDayDetailed(twoSlots, mulberry32(1), arrival).traces[0]
    expect(one?.serviceTimes).toEqual([10, 20])
    expect(two?.serviceTimes).toEqual([10, 10])
  })

  it('全員分が揃う設定では最後の提供時刻から全員が食べ始める', () => {
    const config = testConfig()
    config.kitchen.waitForAllMeals = true
    const trace = simulateDayDetailed(config, mulberry32(1), {
      arrivals: [{ time: 0, partySize: 2 }],
    }).traces[0]
    expect(trace?.mealStartTimes).toEqual([20, 20])
  })

  it('最後の客の完食後に卓を解放する', () => {
    const trace = simulateDayDetailed(testConfig(), mulberry32(1), {
      arrivals: [{ time: 0, partySize: 2 }],
    }).traces[0]
    expect(trace?.mealFinishTimes).toEqual([15, 25])
    expect(trace?.releaseTime).toBe(25)
  })

  it('会計時間と片付け時間を卓解放時刻に加算する', () => {
    const config = testConfig()
    config.business.checkoutMinutes = 3
    config.business.cleanupMinutes = 7
    const trace = simulateDayDetailed(config, mulberry32(1), {
      arrivals: [{ time: 0, partySize: 2 }],
    }).traces[0]
    expect(trace?.releaseTime).toBe(35)
  })
})

describe('安全な集計と飽和需要', () => {
  it('稼働率を0〜100%に収め、売上を負にしない', () => {
    const config = testConfig()
    config.pricing = { meanPerPerson: 0, variation: 10000 }
    const day = simulateDay(config, mulberry32(999), {
      arrivals: [{ time: 0, partySize: 2 }],
    })
    expect(day.tableUtilization).toBeGreaterThanOrEqual(0)
    expect(day.tableUtilization).toBeLessThanOrEqual(1)
    expect(day.seatUtilization).toBeGreaterThanOrEqual(0)
    expect(day.seatUtilization).toBeLessThanOrEqual(1)
    expect(day.kitchenUtilization).toBeGreaterThanOrEqual(0)
    expect(day.kitchenUtilization).toBeLessThanOrEqual(1)
    expect(day.revenue).toBeGreaterThanOrEqual(0)
  })

  it('飽和需要は通常モードの来店頻度から独立する', () => {
    const lowDemand = testConfig()
    const highDemand = testConfig()
    highDemand.arrivalPeriods[0]!.groupsPerHour = 100
    const lowResult = runAnalysis(lowDemand)
    const highResult = runAnalysis(highDemand)
    expect(highResult.saturatedDays).toEqual(lowResult.saturatedDays)
    expect(highResult.normalDays).not.toEqual(lowResult.normalDays)
  })

  it('固定条件の各集計値を定義どおりに計算する', () => {
    const config = testConfig()
    config.tables = [{ id: 'four', name: '4人卓', capacity: 4, count: 1 }]
    const day = simulateDay(config, mulberry32(1), {
      arrivals: [{ time: 0, partySize: 2 }],
    })

    expect(day).toMatchObject({
      revenue: 2000,
      arrivedGroups: 1,
      arrivedPeople: 2,
      acceptedGroups: 1,
      acceptedPeople: 2,
      rejectedFullGroups: 0,
      rejectedOversizeGroups: 0,
      rejectedLastOrderGroups: 0,
      lostRevenue: 0,
      averageServiceWait: 15,
      maxServiceWait: 20,
      averageStay: 25,
      maxStay: 25,
      overtimeMinutes: 0,
      maxKitchenQueue: 1,
    })
    expect(day.tableUtilization).toBeCloseTo(25 / 60)
    expect(day.seatUtilization).toBeCloseTo((2 * 25) / (4 * 60))
    expect(day.kitchenUtilization).toBeCloseTo(20 / 60)
  })

  it('LO超過離脱の占有、機会損失、終了後処理を集計する', () => {
    const config = testConfig()
    config.business.orderMinutes = 10
    const day = simulateDay(config, mulberry32(1), {
      arrivals: [{ time: 55, partySize: 2 }],
    })

    expect(day.revenue).toBe(0)
    expect(day.lostRevenue).toBe(2000)
    expect(day.rejectedLastOrderPeople).toBe(2)
    expect(day.tableUtilization).toBeCloseTo(5 / 60)
    expect(day.seatUtilization).toBeCloseTo(10 / 120)
    expect(day.kitchenUtilization).toBe(0)
    expect(day.overtimeMinutes).toBe(5)
  })

  it('ラストオーダー後の卓・厨房占有を稼働率へ含めない', () => {
    const config = testConfig()
    config.partySizeWeights = [100, 0, 0, 0, 0, 0]
    const day = simulateDay(config, mulberry32(1), {
      arrivals: [{ time: 50, partySize: 1 }],
    })

    // 50分から卓解放65分までのうち、LOまでの10分だけを稼働率へ含める。
    expect(day.tableUtilization).toBeCloseTo(10 / 60)
    expect(day.seatUtilization).toBeCloseTo(10 / 120)
    expect(day.kitchenUtilization).toBeCloseTo(10 / 60)
    expect(day.overtimeMinutes).toBe(5)
  })

  it('飽和需要では時間と客単価の変動幅を使用しない', () => {
    const config = testConfig()
    config.kitchen.cookVariationMinutes = 100
    config.kitchen.diningVariationMinutes = 100
    config.pricing.variation = 10000
    const { day, traces } = simulateDayDetailed(config, mulberry32(999), {
      mode: 'saturated',
      arrivals: [{ time: 0, partySize: 2 }],
    })

    expect(day.revenue).toBe(2000)
    expect(traces[0]?.serviceTimes).toEqual([10, 20])
    expect(traces[0]?.mealFinishTimes).toEqual([15, 25])
  })

  it('進捗を単調増加で通知し最後に100%を通知する', () => {
    const progress: number[] = []
    runAnalysis(testConfig(), (percentage) => progress.push(percentage))
    expect(progress.at(-1)).toBe(100)
    expect(progress.every((value, index) => index === 0 || value >= (progress[index - 1] ?? 0))).toBe(true)
  })
})
