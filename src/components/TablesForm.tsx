import type { SimulatorConfig, TableType } from '../simulation/types'
import { convertTableKind } from '../utils/config'
import { FormField } from './FormField'
import { NUMBER_OPTIONS } from './numberOptions'

interface Props {
  config: SimulatorConfig
  onChange: (tables: TableType[]) => void
}

export function TablesForm({ config, onChange }: Props) {
  const update = <K extends keyof TableType>(index: number, key: K, value: TableType[K]) => {
    onChange(config.tables.map((table, tableIndex) => (tableIndex === index ? { ...table, [key]: value } : table)))
  }
  const updateKind = (index: number, kind: TableType['kind']) => {
    const current = config.tables[index]
    if (!current) return
    onChange(
      config.tables.map((table, tableIndex) =>
        tableIndex === index ? convertTableKind(current, kind) : table,
      ),
    )
  }
  const add = () =>
    onChange([
      ...config.tables,
      { id: `table-${Date.now()}`, name: '新しい卓', kind: 'table', capacity: 2, count: 1 },
    ])

  return (
    <section className="panel" aria-labelledby="tables-heading">
      <div className="section-heading">
        <span>02</span>
        <div>
          <h2 id="tables-heading">座席構成</h2>
          <p>通常卓、1人専用カウンター、グループ対応の連続カウンターを設定できます。</p>
        </div>
      </div>
      <div className="repeater">
        {config.tables.map((table, index) => (
          <div className="repeat-row table-row" key={table.id}>
            <FormField id={`table-name-${table.id}`} label={`種別 ${index + 1}・名称`} value={table.name} onChange={(event) => update(index, 'name', event.target.value)} />
            <div className="field">
              <label htmlFor={`table-kind-${table.id}`}>座席形式</label>
              <select id={`table-kind-${table.id}`} value={table.kind} onChange={(event) => updateKind(index, event.target.value as TableType['kind'])}>
                <option value="table">通常卓</option>
                <option value="counter-single">1人専用カウンター</option>
                <option value="counter-contiguous">連続カウンター</option>
              </select>
            </div>
            <FormField
              id={`table-capacity-${table.id}`}
              label={table.kind === 'counter-contiguous' ? '1列あたりの席数' : table.kind === 'counter-single' ? '1席あたりの定員' : '1卓あたりの定員'}
              unit="人"
              type="number"
              min="1"
              step="1"
              value={table.capacity}
              disabled={table.kind === 'counter-single'}
              options={table.kind === 'counter-single' ? undefined : NUMBER_OPTIONS.capacity}
              onChange={(event) => update(index, 'capacity', Number(event.target.value))}
              onOptionSelect={(value) => update(index, 'capacity', value)}
            />
            <FormField
              id={`table-count-${table.id}`}
              label={table.kind === 'counter-contiguous' ? 'カウンター列数' : table.kind === 'counter-single' ? '席数' : '卓数'}
              unit={table.kind === 'counter-contiguous' ? '列' : table.kind === 'counter-single' ? '席' : '卓'}
              type="number"
              min="1"
              step="1"
              value={table.count}
              options={NUMBER_OPTIONS.tableCount}
              onChange={(event) => update(index, 'count', Number(event.target.value))}
              onOptionSelect={(value) => update(index, 'count', value)}
            />
            <button className="button danger ghost row-action" type="button" onClick={() => onChange(config.tables.filter((_, tableIndex) => tableIndex !== index))} aria-label={`${table.name}を削除`}>削除</button>
          </div>
        ))}
      </div>
      <p className="hint counter-hint">連続カウンターは同じ列内の隣接席だけをグループへ割り当てます。別の列をまたいだ案内は行いません。座席形式を切り替えると、総席数をなるべく維持するよう席数・列数を変換します。</p>
      <button className="button secondary" type="button" onClick={add}>＋ テーブル種別を追加</button>
    </section>
  )
}
