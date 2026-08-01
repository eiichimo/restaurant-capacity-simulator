import type { BusinessSettings, SimulatorConfig } from '../simulation/types'

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
