import { describe, expect, it } from 'vitest'
import { exponentialInterval, mulberry32, uniformAround, type RandomSource } from './random'

const fixed = (value: number): RandomSource => ({ next: () => value })

describe('疑似乱数と分布', () => {
  it('mulberry32は同じシードで同じ系列を生成する', () => {
    const first = mulberry32(1234)
    const second = mulberry32(1234)
    const other = mulberry32(1235)
    const firstSequence = Array.from({ length: 10 }, () => first.next())
    expect(Array.from({ length: 10 }, () => second.next())).toEqual(firstSequence)
    expect(Array.from({ length: 10 }, () => other.next())).not.toEqual(firstSequence)
    expect(firstSequence.every((value) => value >= 0 && value < 1)).toBe(true)
  })

  it('平均±変動幅の範囲で生成し0未満を補正する', () => {
    expect(uniformAround(10, 4, fixed(0))).toBe(6)
    expect(uniformAround(10, 4, fixed(0.5))).toBe(10)
    expect(uniformAround(10, 4, fixed(1))).toBe(14)
    expect(uniformAround(2, 5, fixed(0))).toBe(0)
  })

  it('指数分布の逆関数とゼロ到着率を扱う', () => {
    expect(exponentialInterval(2, fixed(0.5))).toBeCloseTo(Math.log(2) / 2)
    expect(exponentialInterval(0, fixed(0.5))).toBe(Number.POSITIVE_INFINITY)
  })
})
