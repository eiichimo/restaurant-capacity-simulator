import type { SimulatorConfig } from '../simulation/types'
import { FormField } from './FormField'
import { NUMBER_OPTIONS } from './numberOptions'

interface Props {
  config: SimulatorConfig
  onKitchenChange: (kitchen: SimulatorConfig['kitchen']) => void
  onPricingChange: (pricing: SimulatorConfig['pricing']) => void
}

export function KitchenPricingForm({ config, onKitchenChange, onPricingChange }: Props) {
  const kitchen = <K extends keyof SimulatorConfig['kitchen']>(key: K, value: SimulatorConfig['kitchen'][K]) => onKitchenChange({ ...config.kitchen, [key]: value })
  const pricing = <K extends keyof SimulatorConfig['pricing']>(key: K, value: SimulatorConfig['pricing'][K]) => onPricingChange({ ...config.pricing, [key]: value })
  return (
    <>
      <section className="panel" aria-labelledby="kitchen-heading">
        <div className="section-heading"><span>04</span><div><h2 id="kitchen-heading">厨房条件</h2><p>1人分を1ジョブとして、空きが最も早いスロットへ順に割り当てます。</p></div></div>
        <div className="form-grid">
          <FormField id="kitchen-slots" label="同時調理可能人数" unit="人分" type="number" min="1" step="1" value={config.kitchen.slots} options={NUMBER_OPTIONS.kitchenSlots} onChange={(event) => kitchen('slots', Number(event.target.value))} onOptionSelect={(value) => kitchen('slots', value)} />
          <FormField id="cook-mean" label="1人分の平均調理時間" unit="分" type="number" min="0" step="1" value={config.kitchen.cookMeanMinutes} options={NUMBER_OPTIONS.cookMinutes} onChange={(event) => kitchen('cookMeanMinutes', Number(event.target.value))} onOptionSelect={(value) => kitchen('cookMeanMinutes', value)} />
          <FormField id="cook-variation" label="調理時間の変動幅（±）" unit="分" type="number" min="0" step="1" value={config.kitchen.cookVariationMinutes} options={NUMBER_OPTIONS.cookMinutes} onChange={(event) => kitchen('cookVariationMinutes', Number(event.target.value))} onOptionSelect={(value) => kitchen('cookVariationMinutes', value)} />
          <FormField id="dining-mean" label="提供後の食事時間平均" unit="分" type="number" min="0" step="1" value={config.kitchen.diningMeanMinutes} options={NUMBER_OPTIONS.diningMinutes} onChange={(event) => kitchen('diningMeanMinutes', Number(event.target.value))} onOptionSelect={(value) => kitchen('diningMeanMinutes', value)} />
          <FormField id="dining-variation" label="食事時間の変動幅（±）" unit="分" type="number" min="0" step="1" value={config.kitchen.diningVariationMinutes} options={NUMBER_OPTIONS.diningMinutes} onChange={(event) => kitchen('diningVariationMinutes', Number(event.target.value))} onOptionSelect={(value) => kitchen('diningVariationMinutes', value)} />
        </div>
        <label className="check-field" htmlFor="wait-for-all"><input id="wait-for-all" type="checkbox" checked={config.kitchen.waitForAllMeals} onChange={(event) => kitchen('waitForAllMeals', event.target.checked)} /><span><strong>全員分が揃ってから食べ始める</strong><small>無効の場合は、各料理が提供された時点から食事を開始します。</small></span></label>
      </section>
      <section className="panel" aria-labelledby="pricing-heading">
        <div className="section-heading"><span>05</span><div><h2 id="pricing-heading">客単価</h2><p>通常試行では各客ごとに一様分布で変動し、0円未満は0円に補正します。</p></div></div>
        <div className="form-grid compact-grid">
          <FormField id="price-mean" label="1人あたり平均客単価" unit="円" type="number" min="0" step="100" value={config.pricing.meanPerPerson} options={NUMBER_OPTIONS.price} onChange={(event) => pricing('meanPerPerson', Number(event.target.value))} onOptionSelect={(value) => pricing('meanPerPerson', value)} />
          <FormField id="price-variation" label="客単価の変動幅（±）" unit="円" type="number" min="0" step="100" value={config.pricing.variation} options={NUMBER_OPTIONS.priceVariation} onChange={(event) => pricing('variation', Number(event.target.value))} onOptionSelect={(value) => pricing('variation', value)} />
        </div>
      </section>
    </>
  )
}
