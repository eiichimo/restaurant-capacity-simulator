import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../presets'
import { parseConfigJson, validateConfig } from './validation'

describe('設定検証', () => {
  it('不正なJSONと不正な型を拒否する', () => {
    expect(parseConfigJson('{broken').config).toBeUndefined()
    expect(parseConfigJson(JSON.stringify({ schemaVersion: 1 })).config).toBeUndefined()
    expect(parseConfigJson(JSON.stringify({ ...DEFAULT_CONFIG, seed: 'abc' })).config).toBeUndefined()
  })

  it('schemaVersion 1の設定を座席形式付きの現行形式へ移行する', () => {
    const legacy = structuredClone(DEFAULT_CONFIG) as unknown as Record<string, unknown>
    legacy.schemaVersion = 1
    legacy.tables = [
      { id: 'counter', name: 'カウンター', capacity: 1, count: 4 },
      { id: 'table', name: '2人卓', capacity: 2, count: 2 },
    ]
    const parsed = parseConfigJson(JSON.stringify(legacy)).config
    expect(parsed?.schemaVersion).toBe(2)
    expect(parsed?.tables[0]?.kind).toBe('counter-single')
    expect(parsed?.tables[1]?.kind).toBe('table')
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

  it('不正な座席形式と定員1以外の1人専用カウンターを拒否する', () => {
    const invalidKind = structuredClone(DEFAULT_CONFIG) as unknown as Record<string, unknown>
    invalidKind.tables = [
      { id: 'invalid', name: '不正', kind: 'unknown', capacity: 2, count: 1 },
    ]
    expect(validateConfig(invalidKind).errors.some((error) => error.includes('座席形式'))).toBe(true)

    const invalidSingle = structuredClone(DEFAULT_CONFIG)
    invalidSingle.tables = [
      { id: 'single', name: '1人専用', kind: 'counter-single', capacity: 2, count: 4 },
    ]
    expect(validateConfig(invalidSingle).errors.some((error) => error.includes('定員を1'))).toBe(true)
  })
})
