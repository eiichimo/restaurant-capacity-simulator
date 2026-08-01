import { timeToDayMinutes } from './time'
import { SCHEMA_VERSION, type SimulatorConfig, type TrialCount } from './types'

const TRIAL_COUNTS: TrialCount[] = [100, 1000, 5000, 10000]

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function nonNegative(value: unknown): value is number {
  return finite(value) && value >= 0
}

function positiveInteger(value: unknown): value is number {
  return finite(value) && Number.isInteger(value) && value > 0
}

export function validateConfig(value: unknown): ValidationResult {
  const errors: string[] = []
  if (!isRecord(value)) return { valid: false, errors: ['設定データがオブジェクトではありません。'] }
  if (value.schemaVersion !== SCHEMA_VERSION) {
    errors.push(`schemaVersion は ${SCHEMA_VERSION} である必要があります。`)
  }

  const business = value.business
  if (!isRecord(business)) {
    errors.push('営業条件が不正です。')
  } else {
    const open = typeof business.openTime === 'string' ? timeToDayMinutes(business.openTime) : Number.NaN
    const close =
      typeof business.lastOrderTime === 'string'
        ? timeToDayMinutes(business.lastOrderTime)
        : Number.NaN
    if (!Number.isFinite(open)) errors.push('開店時刻を正しい時刻で入力してください。')
    if (!Number.isFinite(close)) errors.push('ラストオーダー時刻を正しい時刻で入力してください。')
    if (Number.isFinite(open) && Number.isFinite(close) && close <= open) {
      errors.push('ラストオーダー時刻は開店時刻より後にしてください（同一営業日内）。')
    }
    for (const [key, label] of [
      ['orderMinutes', '注文確定までの平均時間'],
      ['checkoutMinutes', '会計時間'],
      ['cleanupMinutes', '片付け時間'],
    ] as const) {
      if (!nonNegative(business[key])) errors.push(`${label}は0以上の数値にしてください。`)
    }
  }

  if (!Array.isArray(value.tables) || value.tables.length === 0) {
    errors.push('テーブル種別を1つ以上設定してください。')
  } else {
    value.tables.forEach((table, index) => {
      if (!isRecord(table)) {
        errors.push(`テーブル種別${index + 1}が不正です。`)
        return
      }
      if (typeof table.id !== 'string' || !table.id) errors.push(`テーブル種別${index + 1}のIDが不正です。`)
      if (typeof table.name !== 'string' || !table.name.trim()) errors.push(`テーブル種別${index + 1}の名称を入力してください。`)
      if (!positiveInteger(table.capacity)) errors.push(`テーブル種別${index + 1}の定員は1以上の整数にしてください。`)
      if (!positiveInteger(table.count)) errors.push(`テーブル種別${index + 1}の卓数は1以上の整数にしてください。`)
    })
    const tableIds = value.tables.flatMap((table) =>
      isRecord(table) && typeof table.id === 'string' ? [table.id] : [],
    )
    if (new Set(tableIds).size !== tableIds.length) errors.push('テーブル種別のIDが重複しています。')
  }

  const open = isRecord(business) && typeof business.openTime === 'string' ? timeToDayMinutes(business.openTime) : Number.NaN
  const close = isRecord(business) && typeof business.lastOrderTime === 'string' ? timeToDayMinutes(business.lastOrderTime) : Number.NaN
  if (!Array.isArray(value.arrivalPeriods) || value.arrivalPeriods.length === 0) {
    errors.push('来店時間帯を1つ以上設定してください。')
  } else {
    const ranges: Array<{ start: number; end: number; index: number }> = []
    value.arrivalPeriods.forEach((period, index) => {
      if (!isRecord(period)) {
        errors.push(`来店時間帯${index + 1}が不正です。`)
        return
      }
      const start = typeof period.startTime === 'string' ? timeToDayMinutes(period.startTime) : Number.NaN
      const end = typeof period.endTime === 'string' ? timeToDayMinutes(period.endTime) : Number.NaN
      if (typeof period.id !== 'string' || !period.id) errors.push(`来店時間帯${index + 1}のIDが不正です。`)
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        errors.push(`来店時間帯${index + 1}の開始・終了時刻を正しく設定してください。`)
      } else {
        ranges.push({ start, end, index })
        if (Number.isFinite(open) && Number.isFinite(close) && (start < open || end > close)) {
          errors.push(`来店時間帯${index + 1}は開店〜ラストオーダーの範囲内にしてください。`)
        }
      }
      if (!nonNegative(period.groupsPerHour)) errors.push(`来店時間帯${index + 1}の平均来店組数は0以上にしてください。`)
    })
    const periodIds = value.arrivalPeriods.flatMap((period) =>
      isRecord(period) && typeof period.id === 'string' ? [period.id] : [],
    )
    if (new Set(periodIds).size !== periodIds.length) errors.push('来店時間帯のIDが重複しています。')
    ranges.sort((a, b) => a.start - b.start)
    for (let index = 1; index < ranges.length; index += 1) {
      const previous = ranges[index - 1]
      const current = ranges[index]
      if (previous && current && current.start < previous.end) {
        errors.push(`来店時間帯${current.index + 1}が他の時間帯と重複しています。`)
      }
    }
  }

  if (!Array.isArray(value.partySizeWeights) || value.partySizeWeights.length !== 6) {
    errors.push('グループ人数比率は1〜6人の6項目を設定してください。')
  } else if (value.partySizeWeights.some((weight) => !nonNegative(weight))) {
    errors.push('グループ人数比率は0以上の数値にしてください。')
  } else if (value.partySizeWeights.reduce((sum, weight) => sum + Number(weight), 0) <= 0) {
    errors.push('グループ人数比率は、少なくとも1つを0より大きくしてください。')
  }

  const kitchen = value.kitchen
  if (!isRecord(kitchen)) {
    errors.push('厨房条件が不正です。')
  } else {
    if (!positiveInteger(kitchen.slots)) errors.push('同時調理可能人数は1以上の整数にしてください。')
    for (const [key, label] of [
      ['cookMeanMinutes', '平均調理時間'],
      ['cookVariationMinutes', '調理時間の変動幅'],
      ['diningMeanMinutes', '食事時間平均'],
      ['diningVariationMinutes', '食事時間の変動幅'],
    ] as const) {
      if (!nonNegative(kitchen[key])) errors.push(`${label}は0以上の数値にしてください。`)
    }
    if (typeof kitchen.waitForAllMeals !== 'boolean') errors.push('全員分が揃ってから食べ始める設定が不正です。')
  }

  const pricing = value.pricing
  if (!isRecord(pricing)) {
    errors.push('客単価設定が不正です。')
  } else {
    if (!nonNegative(pricing.meanPerPerson)) errors.push('平均客単価は0以上にしてください。')
    if (!nonNegative(pricing.variation)) errors.push('客単価の変動幅は0以上にしてください。')
  }
  if (!finite(value.seed) || !Number.isInteger(value.seed)) errors.push('シード値は整数にしてください。')
  if (!finite(value.trials) || !TRIAL_COUNTS.includes(value.trials as TrialCount)) {
    errors.push('試行回数は100、1,000、5,000、10,000回から選んでください。')
  }
  return { valid: errors.length === 0, errors }
}

export function parseConfigJson(json: string): { config?: SimulatorConfig; errors: string[] } {
  let parsed: unknown
  try {
    parsed = JSON.parse(json) as unknown
  } catch {
    return { errors: ['JSONの形式が正しくありません。'] }
  }
  const validation = validateConfig(parsed)
  if (!validation.valid) return { errors: validation.errors }
  return { config: parsed as SimulatorConfig, errors: [] }
}
