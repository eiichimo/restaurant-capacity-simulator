import type { SimulatorConfig } from '../simulation/types'
import { FormField } from './FormField'
import { NUMBER_OPTIONS } from './numberOptions'

interface Props {
  config: SimulatorConfig
  onChange: (business: SimulatorConfig['business']) => void
}

export function BusinessForm({ config, onChange }: Props) {
  const update = <K extends keyof SimulatorConfig['business']>(
    key: K,
    value: SimulatorConfig['business'][K],
  ) => onChange({ ...config.business, [key]: value })

  return (
    <section className="panel" aria-labelledby="business-heading">
      <div className="section-heading">
        <span>01</span>
        <div>
          <h2 id="business-heading">営業条件</h2>
          <p>同一営業日内の時刻と、卓が占有される付帯時間を設定します。</p>
        </div>
      </div>
      <div className="form-grid">
        <FormField id="open-time" label="開店時刻" type="time" value={config.business.openTime} onChange={(event) => update('openTime', event.target.value)} />
        <FormField id="last-order-time" label="ラストオーダー時刻" type="time" value={config.business.lastOrderTime} onChange={(event) => update('lastOrderTime', event.target.value)} />
        <FormField id="order-minutes" label="注文確定までの平均時間" unit="分" type="number" min="0" step="1" value={config.business.orderMinutes} options={NUMBER_OPTIONS.shortMinutes} onChange={(event) => update('orderMinutes', Number(event.target.value))} onOptionSelect={(value) => update('orderMinutes', value)} />
        <FormField id="checkout-minutes" label="会計時間" unit="分" type="number" min="0" step="1" value={config.business.checkoutMinutes} options={NUMBER_OPTIONS.shortMinutes} onChange={(event) => update('checkoutMinutes', Number(event.target.value))} onOptionSelect={(value) => update('checkoutMinutes', value)} />
        <FormField id="cleanup-minutes" label="退店後の片付け時間" unit="分" type="number" min="0" step="1" value={config.business.cleanupMinutes} options={NUMBER_OPTIONS.shortMinutes} onChange={(event) => update('cleanupMinutes', Number(event.target.value))} onOptionSelect={(value) => update('cleanupMinutes', value)} />
      </div>
    </section>
  )
}
