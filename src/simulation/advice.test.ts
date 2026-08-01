import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../presets'
import { buildChatGptAnalysisPrompt } from '../utils/analysisPrompt'
import { generateOperationalAdvice } from './advice'
import type {
  AnalysisResult,
  BottleneckKind,
  SummaryStatistics,
} from './types'

function summary(overrides: Partial<SummaryStatistics> = {}): SummaryStatistics {
  return {
    averageRevenue: 50000,
    medianRevenue: 49000,
    revenueP10: 40000,
    revenueP90: 60000,
    minRevenue: 30000,
    maxRevenue: 70000,
    averageAcceptedPeople: 35,
    averageRejectedPeople: 3,
    averageTableUtilization: 0.6,
    averageSeatUtilization: 0.5,
    averageKitchenUtilization: 0.6,
    averageServiceWait: 10,
    averageStay: 55,
    averageOvertime: 10,
    averageRejectedFullGroups: 0,
    averageRejectedOversizeGroups: 0,
    averageRejectedLastOrderGroups: 0,
    averageMaxKitchenQueue: 2,
    ...overrides,
  }
}

function analysis(
  kinds: BottleneckKind[] = ['明確な制約なし'],
  overrides: Partial<SummaryStatistics> = {},
): AnalysisResult {
  return {
    normalDays: [],
    saturatedDays: [],
    summary: summary(overrides),
    saturatedAveragePeople: 60,
    capacityRevenue: 84000,
    capacityConsumptionRate: 0.6,
    bottlenecks: kinds.map((kind) => ({ kind, message: `${kind}のテスト判定` })),
  }
}

describe('運営改善候補', () => {
  it('厨房制約ではスロット追加と調理時間短縮を別条件で提案する', () => {
    const items = generateOperationalAdvice(
      DEFAULT_CONFIG,
      analysis(['厨房制約'], { averageKitchenUtilization: 0.85, averageServiceWait: 24 }),
    )
    const kitchen = items.find((item) => item.id === 'kitchen')
    expect(kitchen?.rationale).toContain('85.0%')
    expect(kitchen?.experiments).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`${DEFAULT_CONFIG.kitchen.slots + 1}人分`),
        expect.stringContaining('10%短縮'),
        expect.stringContaining('同じシード'),
      ]),
    )
  })

  it('卓構成不一致、大人数、LO、終了後処理を個別の仮説にする', () => {
    const items = generateOperationalAdvice(
      DEFAULT_CONFIG,
      analysis(['座席構成の不一致', 'ラストオーダー設定'], {
        averageTableUtilization: 0.82,
        averageSeatUtilization: 0.5,
        averageRejectedOversizeGroups: 0.4,
        averageRejectedLastOrderGroups: 2,
        averageOvertime: 30,
      }),
    )
    expect(items.map((item) => item.id)).toEqual(
      expect.arrayContaining(['oversize', 'seating-mix', 'last-order', 'overtime']),
    )
  })

  it('需要不足では設備投資より需要感度の比較を提示する', () => {
    const items = generateOperationalAdvice(
      DEFAULT_CONFIG,
      analysis(['需要不足'], {
        averageTableUtilization: 0.2,
        averageKitchenUtilization: 0.15,
      }),
    )
    expect(items.map((item) => item.id)).toContain('demand')
    expect(items.find((item) => item.id === 'demand')?.experiments.join(' ')).toContain('来店組数')
  })

  it('明確な制約がなくても1変数ずつの感度分析を提示する', () => {
    expect(generateOperationalAdvice(DEFAULT_CONFIG, analysis())[0]?.id).toBe('sensitivity')
  })
})

describe('ChatGPT解析用テキスト', () => {
  it('入力、結果、改善仮説、制約、非断定の指示を含める', () => {
    const prompt = buildChatGptAnalysisPrompt(
      DEFAULT_CONFIG,
      analysis(['厨房制約'], { averageKitchenUtilization: 0.85 }),
    )

    expect(prompt).toContain('# 飲食店シミュレーション結果の分析依頼')
    expect(prompt).toContain('"schemaVersion": 2')
    expect(prompt).toContain('"averageRevenueYen": 50000')
    expect(prompt).toContain('"localHypotheses"')
    expect(prompt).toContain('人件費、食材原価、設備費')
    expect(prompt).toContain('結果を断定せず')
    expect(prompt).not.toContain('undefined')
    expect(prompt).not.toContain('NaN')
  })
})
