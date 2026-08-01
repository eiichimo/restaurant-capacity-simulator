import type { DayResult, SummaryStatistics } from './types'

export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function percentile(values: readonly number[], fraction: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const position = Math.min(1, Math.max(0, fraction)) * (sorted.length - 1)
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  const lowerValue = sorted[lower] ?? 0
  const upperValue = sorted[upper] ?? lowerValue
  return lowerValue + (upperValue - lowerValue) * (position - lower)
}

export function summarizeDays(days: readonly DayResult[]): SummaryStatistics {
  const revenues = days.map((day) => day.revenue)
  const average = (selector: (day: DayResult) => number) => mean(days.map(selector))
  return {
    averageRevenue: mean(revenues),
    medianRevenue: percentile(revenues, 0.5),
    revenueP10: percentile(revenues, 0.1),
    revenueP90: percentile(revenues, 0.9),
    minRevenue: revenues.length ? Math.min(...revenues) : 0,
    maxRevenue: revenues.length ? Math.max(...revenues) : 0,
    averageAcceptedPeople: average((day) => day.acceptedPeople),
    averageRejectedPeople: average(
      (day) => day.rejectedFullPeople + day.rejectedOversizePeople + day.rejectedLastOrderPeople,
    ),
    averageTableUtilization: average((day) => day.tableUtilization),
    averageSeatUtilization: average((day) => day.seatUtilization),
    averageKitchenUtilization: average((day) => day.kitchenUtilization),
    averageServiceWait: average((day) => day.averageServiceWait),
    averageStay: average((day) => day.averageStay),
    averageOvertime: average((day) => day.overtimeMinutes),
    averageRejectedFullGroups: average((day) => day.rejectedFullGroups),
    averageRejectedOversizeGroups: average((day) => day.rejectedOversizeGroups),
    averageRejectedLastOrderGroups: average((day) => day.rejectedLastOrderGroups),
    averageMaxKitchenQueue: average((day) => day.maxKitchenQueue),
  }
}
