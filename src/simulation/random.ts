export interface RandomSource {
  next(): number
}

export function mulberry32(seed: number): RandomSource {
  let state = seed >>> 0
  return {
    next(): number {
      state = (state + 0x6d2b79f5) >>> 0
      let value = state
      value = Math.imul(value ^ (value >>> 15), value | 1)
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296
    },
  }
}

export function uniformAround(mean: number, variation: number, random: RandomSource): number {
  const safeMean = Number.isFinite(mean) ? Math.max(0, mean) : 0
  const safeVariation = Number.isFinite(variation) ? Math.max(0, variation) : 0
  return Math.max(0, safeMean + (random.next() * 2 - 1) * safeVariation)
}

export function exponentialInterval(ratePerMinute: number, random: RandomSource): number {
  if (ratePerMinute <= 0) return Number.POSITIVE_INFINITY
  return -Math.log(Math.max(Number.EPSILON, 1 - random.next())) / ratePerMinute
}
