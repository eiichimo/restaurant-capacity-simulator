import type { SimulatorConfig, TableType } from '../simulation/types'
import { FormField } from './FormField'

interface Props {
  config: SimulatorConfig
  onChange: (tables: TableType[]) => void
}

export function TablesForm({ config, onChange }: Props) {
  const update = <K extends keyof TableType>(index: number, key: K, value: TableType[K]) => {
    onChange(config.tables.map((table, tableIndex) => (tableIndex === index ? { ...table, [key]: value } : table)))
  }
  const add = () =>
    onChange([
      ...config.tables,
      { id: `table-${Date.now()}`, name: '新しい卓', capacity: 2, count: 1 },
    ])

  return (
    <section className="panel" aria-labelledby="tables-heading">
      <div className="section-heading">
        <span>02</span>
        <div>
          <h2 id="tables-heading">座席構成</h2>
          <p>各卓を個別資源として扱い、最小収容可能卓から割り当てます。</p>
        </div>
      </div>
      <div className="repeater">
        {config.tables.map((table, index) => (
          <div className="repeat-row table-row" key={table.id}>
            <FormField id={`table-name-${table.id}`} label={`種別 ${index + 1}・名称`} value={table.name} onChange={(event) => update(index, 'name', event.target.value)} />
            <FormField id={`table-capacity-${table.id}`} label="1卓あたり定員" unit="人" type="number" min="1" step="1" value={table.capacity} onChange={(event) => update(index, 'capacity', Number(event.target.value))} />
            <FormField id={`table-count-${table.id}`} label="卓数" unit="卓" type="number" min="1" step="1" value={table.count} onChange={(event) => update(index, 'count', Number(event.target.value))} />
            <button className="button danger ghost row-action" type="button" onClick={() => onChange(config.tables.filter((_, tableIndex) => tableIndex !== index))} aria-label={`${table.name}を削除`}>削除</button>
          </div>
        ))}
      </div>
      <button className="button secondary" type="button" onClick={add}>＋ テーブル種別を追加</button>
    </section>
  )
}
