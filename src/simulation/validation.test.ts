import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../presets'
import { parseConfigJson, validateConfig } from './validation'

describe('設定検証', () => {
  it('不正なJSONと不正な型を拒否する', () => {
    expect(parseConfigJson('{broken').config).toBeUndefined()
    expect(parseConfigJson(JSON.stringify({ schemaVersion: 1 })).config).toBeUndefined()
    expect(parseConfigJson(JSON.stringify({ ...DEFAULT_CONFIG, seed: 'abc' })).config).toBeUndefined()
  })

  it('正しい設定を受け入れる', () => {
    expect(validateConfig(DEFAULT_CONFIG)).toEqual({ valid: true, errors: [] })
    expect(parseConfigJson(JSON.stringify(DEFAULT_CONFIG)).config).toEqual(DEFAULT_CONFIG)
  })

  it('営業時刻、時間帯範囲、時間帯重複を拒否する', () => {
    const invalidHours = structuredClone(DEFAULT_CONFIG)
    invalidHours.business.lastOrderTime = invalidHours.business.openTime
    expect(validateConfig(invalidHours).errors).toContain(
      'ラストオーダー時刻は開店時刻より後にしてください（同一営業日内）。',
    )

    const outside = structuredClone(DEFAULT_CONFIG)
    outside.arrivalPeriods[0]!.startTime = '10:00'
    expect(validateConfig(outside).errors.some((error) => error.includes('開店〜ラストオーダー'))).toBe(true)

    const overlap = structuredClone(DEFAULT_CONFIG)
    overlap.arrivalPeriods[1]!.startTime = '11:30'
    expect(validateConfig(overlap).errors.some((error) => error.includes('重複'))).toBe(true)
  })

  it('ゼロ合計の人数比率、負数、重複IDを拒否する', () => {
    const zeroWeights = structuredClone(DEFAULT_CONFIG)
    zeroWeights.partySizeWeights = [0, 0, 0, 0, 0, 0]
    expect(validateConfig(zeroWeights).valid).toBe(false)

    const negative = structuredClone(DEFAULT_CONFIG)
    negative.kitchen.cookMeanMinutes = -1
    negative.pricing.meanPerPerson = -1
    expect(validateConfig(negative).errors).toEqual(
      expect.arrayContaining(['平均調理時間は0以上の数値にしてください。', '平均客単価は0以上にしてください。']),
    )

    const duplicateIds = structuredClone(DEFAULT_CONFIG)
    duplicateIds.tables[1]!.id = duplicateIds.tables[0]!.id
    duplicateIds.arrivalPeriods[1]!.id = duplicateIds.arrivalPeriods[0]!.id
    expect(validateConfig(duplicateIds).errors).toEqual(
      expect.arrayContaining(['テーブル種別のIDが重複しています。', '来店時間帯のIDが重複しています。']),
    )
  })
})
