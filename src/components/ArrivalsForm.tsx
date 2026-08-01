import type { ArrivalPeriod, SimulatorConfig } from '../simulation/types'
import { FormField } from './FormField'
import { NUMBER_OPTIONS } from './numberOptions'

interface Props {
  config: SimulatorConfig
  onPeriodsChange: (periods: ArrivalPeriod[]) => void
  onWeightsChange: (weights: SimulatorConfig['partySizeWeights']) => void
}

export function ArrivalsForm({ config, onPeriodsChange, onWeightsChange }: Props) {
  const updatePeriod = <K extends keyof ArrivalPeriod>(index: number, key: K, value: ArrivalPeriod[K]) => {
    onPeriodsChange(config.arrivalPeriods.map((period, periodIndex) => (periodIndex === index ? { ...period, [key]: value } : period)))
  }
  const addPeriod = () => onPeriodsChange([...config.arrivalPeriods, { id: `period-${Date.now()}`, startTime: config.business.openTime, endTime: config.business.lastOrderTime, groupsPerHour: 5 }])
  const updateWeight = (index: number, value: number) => {
    const next = [...config.partySizeWeights] as SimulatorConfig['partySizeWeights']
    next[index] = value
    onWeightsChange(next)
  }
  const weightTotal = config.partySizeWeights.reduce((sum, value) => sum + value, 0)

  return (
    <section className="panel" aria-labelledby="arrivals-heading">
      <div className="section-heading">
        <span>03</span>
        <div>
          <h2 id="arrivals-heading">来店条件</h2>
          <p>時間帯ごとのポアソン到着と、グループ人数の構成を設定します。</p>
        </div>
      </div>
      <h3>時間帯別の来店頻度</h3>
      <div className="repeater">
        {config.arrivalPeriods.map((period, index) => (
          <div className="repeat-row period-row" key={period.id}>
            <FormField id={`period-start-${period.id}`} label={`時間帯 ${index + 1}・開始`} type="time" value={period.startTime} onChange={(event) => updatePeriod(index, 'startTime', event.target.value)} />
            <FormField id={`period-end-${period.id}`} label="終了" type="time" value={period.endTime} onChange={(event) => updatePeriod(index, 'endTime', event.target.value)} />
            <FormField id={`period-rate-${period.id}`} label="平均来店組数" unit="組／時" type="number" min="0" step="0.1" value={period.groupsPerHour} options={NUMBER_OPTIONS.groupsPerHour} onChange={(event) => updatePeriod(index, 'groupsPerHour', Number(event.target.value))} onOptionSelect={(value) => updatePeriod(index, 'groupsPerHour', value)} />
            <button className="button danger ghost row-action" type="button" onClick={() => onPeriodsChange(config.arrivalPeriods.filter((_, periodIndex) => periodIndex !== index))} aria-label={`時間帯${index + 1}を削除`}>削除</button>
          </div>
        ))}
      </div>
      <button className="button secondary" type="button" onClick={addPeriod}>＋ 時間帯を追加</button>
      <div className="subsection-heading">
        <h3>グループ人数比率</h3>
        <span className={weightTotal > 0 ? 'badge' : 'badge error-badge'}>入力合計 {weightTotal.toLocaleString('ja-JP')}%</span>
      </div>
      <p className="hint">合計が100%でなくても計算時に自動で正規化します。</p>
      <div className="weights-grid">
        {config.partySizeWeights.map((weight, index) => (
          <FormField key={index} id={`party-weight-${index + 1}`} label={`${index + 1}人`} unit="%" type="number" min="0" step="1" value={weight} options={NUMBER_OPTIONS.percentage} onChange={(event) => updateWeight(index, Number(event.target.value))} onOptionSelect={(value) => updateWeight(index, value)} />
        ))}
      </div>
    </section>
  )
}
