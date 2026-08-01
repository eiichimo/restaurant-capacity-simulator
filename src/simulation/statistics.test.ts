import { describe, expect, it } from 'vitest'
import { mean, percentile } from './statistics'

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
})
