import { describe, expect, it } from 'vitest'
import { formatClockFromBusiness, timeToDayMinutes, toBusinessMinutes } from './time'

describe('時刻変換', () => {
  it('HH:mmを同一営業日の分へ変換する', () => {
    expect(timeToDayMinutes('00:00')).toBe(0)
    expect(timeToDayMinutes('14:35')).toBe(14 * 60 + 35)
    expect(timeToDayMinutes('23:59')).toBe(23 * 60 + 59)
    expect(Number.isNaN(timeToDayMinutes('24:00'))).toBe(true)
    expect(Number.isNaN(timeToDayMinutes('9:00'))).toBe(true)
  })

  it('開店からの相対分へ相互変換する', () => {
    expect(toBusinessMinutes('14:05', '11:00')).toBe(185)
    expect(formatClockFromBusiness(185, '11:00')).toBe('14:05')
  })
})
