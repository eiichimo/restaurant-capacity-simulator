import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../presets'
import { TablesForm } from './TablesForm'

describe('座席構成フォーム', () => {
  it('3種類の座席形式と連続カウンター用の入力名を表示する', () => {
    const markup = renderToStaticMarkup(
      <TablesForm config={DEFAULT_CONFIG} onChange={() => undefined} />,
    )
    expect(markup).toContain('<option value="table">通常卓</option>')
    expect(markup).toContain('<option value="counter-single">1人専用カウンター</option>')
    expect(markup).toContain('value="counter-contiguous" selected=""')
    expect(markup).toContain('1列あたりの席数')
    expect(markup).toContain('カウンター列数')
  })
})
