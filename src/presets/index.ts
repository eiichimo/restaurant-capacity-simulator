import { SCHEMA_VERSION, type SimulatorConfig } from '../simulation/types'

const common: Omit<SimulatorConfig, 'tables' | 'arrivalPeriods' | 'partySizeWeights'> = {
  schemaVersion: SCHEMA_VERSION,
  business: {
    openTime: '11:00',
    lastOrderTime: '14:00',
    orderMinutes: 8,
    checkoutMinutes: 4,
    cleanupMinutes: 6,
  },
  kitchen: {
    slots: 4,
    cookMeanMinutes: 14,
    cookVariationMinutes: 4,
    diningMeanMinutes: 35,
    diningVariationMinutes: 10,
    waitForAllMeals: true,
  },
  pricing: { meanPerPerson: 1400, variation: 300 },
  seed: 20250801,
  trials: 1000,
}

export const PRESETS: Record<string, SimulatorConfig> = {
  '小規模ランチ店': {
    ...common,
    tables: [
      { id: 'counter', name: 'カウンター', kind: 'counter-contiguous', capacity: 4, count: 1 },
      { id: 'table-2', name: '2人卓', kind: 'table', capacity: 2, count: 2 },
      { id: 'table-4', name: '4人卓', kind: 'table', capacity: 4, count: 2 },
    ],
    arrivalPeriods: [
      { id: 'early', startTime: '11:00', endTime: '12:00', groupsPerHour: 7 },
      { id: 'peak', startTime: '12:00', endTime: '13:00', groupsPerHour: 13 },
      { id: 'late', startTime: '13:00', endTime: '14:00', groupsPerHour: 6 },
    ],
    partySizeWeights: [35, 40, 10, 10, 3, 2],
  },
  'カウンター中心店': {
    ...common,
    tables: [
      { id: 'counter-main', name: 'カウンター', kind: 'counter-contiguous', capacity: 10, count: 1 },
      { id: 'table-2', name: '2人卓', kind: 'table', capacity: 2, count: 2 },
    ],
    arrivalPeriods: [
      { id: 'early', startTime: '11:00', endTime: '12:00', groupsPerHour: 9 },
      { id: 'peak', startTime: '12:00', endTime: '13:00', groupsPerHour: 15 },
      { id: 'late', startTime: '13:00', endTime: '14:00', groupsPerHour: 7 },
    ],
    partySizeWeights: [55, 35, 5, 4, 1, 0],
  },
  '4人卓中心店': {
    ...common,
    tables: [
      { id: 'table-2', name: '2人卓', kind: 'table', capacity: 2, count: 2 },
      { id: 'table-4-main', name: '4人卓', kind: 'table', capacity: 4, count: 5 },
    ],
    arrivalPeriods: [
      { id: 'early', startTime: '11:00', endTime: '12:00', groupsPerHour: 6 },
      { id: 'peak', startTime: '12:00', endTime: '13:00', groupsPerHour: 12 },
      { id: 'late', startTime: '13:00', endTime: '14:00', groupsPerHour: 6 },
    ],
    partySizeWeights: [15, 35, 20, 20, 6, 4],
  },
}

export const DEFAULT_CONFIG: SimulatorConfig = structuredClone(PRESETS['小規模ランチ店']!)

export function clonePreset(name: string): SimulatorConfig {
  return structuredClone(PRESETS[name] ?? DEFAULT_CONFIG)
}
