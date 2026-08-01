import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../presets'
import { applyBusinessSettings, convertTableKind } from './config'

describe('営業条件と来店時間帯の連動', () => {
  it('開店時刻を変更すると時間帯1の開始時刻も変更する', () => {
    const config = structuredClone(DEFAULT_CONFIG)
    const secondPeriodBefore = structuredClone(config.arrivalPeriods[1])
    const updated = applyBusinessSettings(config, {
      ...config.business,
      openTime: '10:30',
    })

    expect(updated.business.openTime).toBe('10:30')
    expect(updated.arrivalPeriods[0]?.startTime).toBe('10:30')
    expect(updated.arrivalPeriods[1]).toEqual(secondPeriodBefore)
  })

  it('開店時刻以外の変更では時間帯1を変更しない', () => {
    const config = structuredClone(DEFAULT_CONFIG)
    config.arrivalPeriods[0]!.startTime = '11:15'
    const updated = applyBusinessSettings(config, {
      ...config.business,
      checkoutMinutes: 8,
    })

    expect(updated.arrivalPeriods[0]?.startTime).toBe('11:15')
  })
})

describe('座席形式の変換', () => {
  it('通常卓を1人専用カウンターへ変えると総席数を維持する', () => {
    const table = { id: 'table', name: '卓', kind: 'table' as const, capacity: 2, count: 3 }
    expect(convertTableKind(table, 'counter-single')).toEqual({
      ...table,
      kind: 'counter-single',
      capacity: 1,
      count: 6,
    })
  })

  it('1人専用カウンターを連続カウンターへ変えると1列にまとめる', () => {
    const counter = {
      id: 'counter',
      name: 'カウンター',
      kind: 'counter-single' as const,
      capacity: 1,
      count: 6,
    }
    expect(convertTableKind(counter, 'counter-contiguous')).toEqual({
      ...counter,
      kind: 'counter-contiguous',
      capacity: 6,
      count: 1,
    })
  })
})
