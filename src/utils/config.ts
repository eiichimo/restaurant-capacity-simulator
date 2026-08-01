import type { BusinessSettings, SimulatorConfig, TableType } from '../simulation/types'

export function applyBusinessSettings(
  config: SimulatorConfig,
  business: BusinessSettings,
): SimulatorConfig {
  if (business.openTime === config.business.openTime || config.arrivalPeriods.length === 0) {
    return { ...config, business }
  }

  return {
    ...config,
    business,
    arrivalPeriods: config.arrivalPeriods.map((period, index) =>
      index === 0 ? { ...period, startTime: business.openTime } : period,
    ),
  }
}

export function convertTableKind(table: TableType, kind: TableType['kind']): TableType {
  if (table.kind === kind) return table
  if (kind === 'counter-single') {
    return {
      ...table,
      kind,
      capacity: 1,
      count: table.kind === 'counter-single' ? table.count : table.capacity * table.count,
    }
  }
  if (kind === 'counter-contiguous' && table.kind === 'counter-single') {
    return { ...table, kind, capacity: table.count, count: 1 }
  }
  return { ...table, kind }
}
