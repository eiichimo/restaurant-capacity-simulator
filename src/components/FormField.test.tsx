import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { FormField } from './FormField'

describe('数値入力フィールド', () => {
  it('モバイル向け入力モードと日本語の候補選択を表示する', () => {
    const markup = renderToStaticMarkup(
      <FormField
        id="minutes"
        label="調理時間"
        unit="分"
        type="number"
        value={10}
        options={[0, 10, 20]}
        onChange={() => undefined}
        onOptionSelect={() => undefined}
      />,
    )

    expect(markup).toContain('inputMode="decimal"')
    expect(markup).toContain('aria-label="調理時間の候補から選択"')
    expect(markup).toContain('<option value="10">10分</option>')
  })
})
