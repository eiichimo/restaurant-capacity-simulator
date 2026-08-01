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
})
