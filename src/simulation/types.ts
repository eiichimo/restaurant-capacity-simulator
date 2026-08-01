export const SCHEMA_VERSION = 1 as const

export type TrialCount = 100 | 1000 | 5000 | 10000

export interface BusinessSettings {
  openTime: string
  lastOrderTime: string
  orderMinutes: number
  checkoutMinutes: number
  cleanupMinutes: number
}

export interface TableType {
  id: string
  name: string
  capacity: number
  count: number
}

export interface ArrivalPeriod {
  id: string
  startTime: string
  endTime: string
  groupsPerHour: number
}

export interface KitchenSettings {
  slots: number
  cookMeanMinutes: number
  cookVariationMinutes: number
  diningMeanMinutes: number
  diningVariationMinutes: number
  waitForAllMeals: boolean
}

export interface PricingSettings {
  meanPerPerson: number
  variation: number
}

export interface SimulatorConfig {
  schemaVersion: typeof SCHEMA_VERSION
  business: BusinessSettings
  tables: TableType[]
  arrivalPeriods: ArrivalPeriod[]
  partySizeWeights: [number, number, number, number, number, number]
  kitchen: KitchenSettings
  pricing: PricingSettings
  seed: number
  trials: TrialCount
}

export interface DayResult {
  revenue: number
  arrivedGroups: number
  arrivedPeople: number
  acceptedGroups: number
  acceptedPeople: number
  rejectedFullGroups: number
  rejectedFullPeople: number
  rejectedOversizeGroups: number
  rejectedOversizePeople: number
  rejectedLastOrderGroups: number
  rejectedLastOrderPeople: number
  lostRevenue: number
  averageServiceWait: number
  maxServiceWait: number
  averageStay: number
  maxStay: number
  tableUtilization: number
  seatUtilization: number
  kitchenUtilization: number
  overtimeMinutes: number
  maxKitchenQueue: number
}

export interface GroupTrace {
  arrivalTime: number
  partySize: number
  outcome: 'accepted' | 'full' | 'oversize' | 'lastOrder'
  tableCapacity?: number
  orderTime?: number
  serviceTimes?: number[]
  mealStartTimes?: number[]
  mealFinishTimes?: number[]
  releaseTime?: number
}

export interface SummaryStatistics {
  averageRevenue: number
  medianRevenue: number
  revenueP10: number
  revenueP90: number
  minRevenue: number
  maxRevenue: number
  averageAcceptedPeople: number
  averageRejectedPeople: number
  averageTableUtilization: number
  averageSeatUtilization: number
  averageKitchenUtilization: number
  averageServiceWait: number
  averageStay: number
  averageOvertime: number
  averageRejectedFullGroups: number
  averageRejectedOversizeGroups: number
  averageRejectedLastOrderGroups: number
  averageMaxKitchenQueue: number
}

export type BottleneckKind =
  | '需要不足'
  | '客席制約'
  | '座席構成の不一致'
  | '厨房制約'
  | 'ラストオーダー設定'
  | '複合制約'
  | '明確な制約なし'

export interface BottleneckFinding {
  kind: BottleneckKind
  message: string
}

export interface AnalysisResult {
  normalDays: DayResult[]
  saturatedDays: DayResult[]
  summary: SummaryStatistics
  saturatedAveragePeople: number
  capacityRevenue: number
  capacityConsumptionRate: number
  bottlenecks: BottleneckFinding[]
}

export interface TestArrival {
  time: number
  partySize: number
}
