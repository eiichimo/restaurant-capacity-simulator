import { detectBottlenecks } from './bottleneck'
import { exponentialInterval, mulberry32, uniformAround, type RandomSource } from './random'
import { mean, summarizeDays } from './statistics'
import { timeToDayMinutes, toBusinessMinutes } from './time'
import type {
  AnalysisResult,
  DayResult,
  GroupTrace,
  SimulatorConfig,
  TestArrival,
} from './types'

interface NormalTableResource {
  kind: 'table'
  capacity: number
  availableAt: number
}

interface CounterRowResource {
  kind: 'counter-single' | 'counter-contiguous'
  capacity: number
  seatAvailableAt: number[]
}

type SeatingResource = NormalTableResource | CounterRowResource

interface SeatingAllocation {
  resource: SeatingResource
  resourceIndex: number
  seatIndexes: number[]
  allocatedSeatCount: number
  effectiveCapacity: number
  waste: number
}

interface Interval {
  start: number
  end: number
  people?: number
  resourceUnits?: number
}

interface SimulateOptions {
  mode?: 'normal' | 'saturated'
  arrivals?: TestArrival[]
}

interface CoreResult {
  day: DayResult
  traces: GroupTrace[]
}

export function normalizePartySizeWeights(
  weights: readonly number[],
): [number, number, number, number, number, number] {
  if (weights.length !== 6 || weights.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error('グループ人数比率は1〜6人の6個の0以上の数値で指定してください。')
  }
  const total = weights.reduce((sum, value) => sum + value, 0)
  if (total <= 0) throw new Error('グループ人数比率は、少なくとも1つを0より大きくしてください。')
  return weights.map((value) => value / total) as [number, number, number, number, number, number]
}

function samplePartySize(weights: readonly number[], random: RandomSource): number {
  const normalized = normalizePartySizeWeights(weights)
  const draw = random.next()
  let cumulative = 0
  for (let index = 0; index < normalized.length; index += 1) {
    cumulative += normalized[index] ?? 0
    if (draw < cumulative) return index + 1
  }
  return 6
}

export function chooseSmallestAvailableTable(
  tables: readonly { capacity: number; availableAt: number }[],
  partySize: number,
  arrivalTime: number,
): number {
  let selectedIndex = -1
  let selectedCapacity = Number.POSITIVE_INFINITY
  tables.forEach((table, index) => {
    if (
      table.availableAt <= arrivalTime &&
      table.capacity >= partySize &&
      table.capacity < selectedCapacity
    ) {
      selectedIndex = index
      selectedCapacity = table.capacity
    }
  })
  return selectedIndex
}

function expandSeatingResources(config: SimulatorConfig): SeatingResource[] {
  return config.tables.flatMap((table): SeatingResource[] => {
    if (table.kind === 'table') {
      return Array.from({ length: table.count }, () => ({
        kind: 'table' as const,
        capacity: table.capacity,
        availableAt: 0,
      }))
    }
    if (table.kind === 'counter-single') {
      return [
        {
          kind: 'counter-single',
          capacity: table.count,
          seatAvailableAt: Array.from({ length: table.count }, () => 0),
        },
      ]
    }
    return Array.from({ length: table.count }, () => ({
      kind: 'counter-contiguous' as const,
      capacity: table.capacity,
      seatAvailableAt: Array.from({ length: table.capacity }, () => 0),
    }))
  })
}

function findContiguousSeats(
  availableTimes: readonly number[],
  partySize: number,
  arrivalTime: number,
): number[] | undefined {
  for (let start = 0; start <= availableTimes.length - partySize; start += 1) {
    const indexes = Array.from({ length: partySize }, (_, offset) => start + offset)
    if (indexes.every((index) => (availableTimes[index] ?? Number.POSITIVE_INFINITY) <= arrivalTime)) {
      return indexes
    }
  }
  return undefined
}

function chooseSeatingAllocation(
  resources: readonly SeatingResource[],
  partySize: number,
  arrivalTime: number,
): SeatingAllocation | undefined {
  const candidates: SeatingAllocation[] = []
  resources.forEach((resource, resourceIndex) => {
    if (resource.kind === 'table') {
      if (resource.availableAt <= arrivalTime && resource.capacity >= partySize) {
        candidates.push({
          resource,
          resourceIndex,
          seatIndexes: [],
          allocatedSeatCount: 1,
          effectiveCapacity: resource.capacity,
          waste: resource.capacity - partySize,
        })
      }
      return
    }
    if (resource.kind === 'counter-single' && partySize !== 1) return
    const seatIndexes = findContiguousSeats(resource.seatAvailableAt, partySize, arrivalTime)
    if (seatIndexes) {
      candidates.push({
        resource,
        resourceIndex,
        seatIndexes,
        allocatedSeatCount: partySize,
        effectiveCapacity: partySize,
        waste: 0,
      })
    }
  })
  candidates.sort(
    (a, b) =>
      a.waste - b.waste ||
      a.effectiveCapacity - b.effectiveCapacity ||
      a.resourceIndex - b.resourceIndex,
  )
  return candidates[0]
}

function releaseAt(allocation: SeatingAllocation, time: number): void {
  if (allocation.resource.kind === 'table') {
    allocation.resource.availableAt = time
    return
  }
  const counter = allocation.resource
  allocation.seatIndexes.forEach((index) => {
    counter.seatAvailableAt[index] = time
  })
}

function maximumPartyCapacity(config: SimulatorConfig): number {
  return Math.max(
    ...config.tables.map((table) =>
      table.kind === 'counter-single' ? 1 : table.capacity,
    ),
    0,
  )
}

function totalSeatCount(config: SimulatorConfig): number {
  return config.tables.reduce((sum, table) => {
    if (table.kind === 'counter-single') return sum + table.count
    return sum + table.capacity * table.count
  }, 0)
}

function seatingResourceUnitCount(config: SimulatorConfig): number {
  return config.tables.reduce((sum, table) => {
    if (table.kind === 'table') return sum + table.count
    if (table.kind === 'counter-single') return sum + table.count
    return sum + table.capacity * table.count
  }, 0)
}

function generateArrivals(
  config: SimulatorConfig,
  random: RandomSource,
  mode: 'normal' | 'saturated',
): TestArrival[] {
  const closing = toBusinessMinutes(config.business.lastOrderTime, config.business.openTime)
  if (mode === 'saturated') {
    const arrivals: TestArrival[] = []
    for (let time = 0; time <= closing; time += 1) {
      arrivals.push({ time, partySize: samplePartySize(config.partySizeWeights, random) })
    }
    return arrivals
  }

  const arrivals: TestArrival[] = []
  for (const period of config.arrivalPeriods) {
    const start = toBusinessMinutes(period.startTime, config.business.openTime)
    const end = toBusinessMinutes(period.endTime, config.business.openTime)
    let time = start
    while (time < end) {
      time += exponentialInterval(period.groupsPerHour / 60, random)
      if (time < end) {
        arrivals.push({ time, partySize: samplePartySize(config.partySizeWeights, random) })
      }
    }
  }
  return arrivals.sort((a, b) => a.time - b.time)
}

function clippedDuration(interval: Interval, end: number): number {
  return Math.max(0, Math.min(interval.end, end) - Math.max(interval.start, 0))
}

function maximumConcurrentQueue(intervals: readonly Interval[]): number {
  const events = intervals.flatMap((interval) => [
    { time: interval.start, delta: 1 },
    { time: interval.end, delta: -1 },
  ])
  events.sort((a, b) => a.time - b.time || a.delta - b.delta)
  let current = 0
  let maximum = 0
  for (const event of events) {
    current += event.delta
    maximum = Math.max(maximum, current)
  }
  return maximum
}

function clampRate(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
}

function simulateDayCore(
  config: SimulatorConfig,
  random: RandomSource,
  options: SimulateOptions,
  includeTraces: boolean,
): CoreResult {
  const mode = options.mode ?? 'normal'
  const closing = timeToDayMinutes(config.business.lastOrderTime) - timeToDayMinutes(config.business.openTime)
  const seatingResources = expandSeatingResources(config)
  const kitchenSlots = Array.from({ length: config.kitchen.slots }, () => 0)
  const seatingIntervals: Interval[] = []
  const kitchenIntervals: Interval[] = []
  const queueIntervals: Interval[] = []
  const arrivals = options.arrivals
    ? [...options.arrivals].sort((a, b) => a.time - b.time)
    : generateArrivals(config, random, mode)
  const traces: GroupTrace[] = []
  const serviceWaits: number[] = []
  const stays: number[] = []
  let revenue = 0
  let acceptedGroups = 0
  let acceptedPeople = 0
  let rejectedFullGroups = 0
  let rejectedFullPeople = 0
  let rejectedOversizeGroups = 0
  let rejectedOversizePeople = 0
  let rejectedLastOrderGroups = 0
  let rejectedLastOrderPeople = 0
  let latestRelease = closing
  const maxCapacity = maximumPartyCapacity(config)

  for (const arrival of arrivals) {
    const trace: GroupTrace = { arrivalTime: arrival.time, partySize: arrival.partySize, outcome: 'full' }
    if (arrival.partySize > maxCapacity) {
      rejectedOversizeGroups += 1
      rejectedOversizePeople += arrival.partySize
      trace.outcome = 'oversize'
      if (includeTraces) traces.push(trace)
      continue
    }

    const allocation = chooseSeatingAllocation(seatingResources, arrival.partySize, arrival.time)
    if (!allocation) {
      rejectedFullGroups += 1
      rejectedFullPeople += arrival.partySize
      trace.outcome = 'full'
      if (includeTraces) traces.push(trace)
      continue
    }
    trace.seatingKind = allocation.resource.kind
    trace.tableCapacity =
      allocation.resource.kind === 'counter-single' ? 1 : allocation.resource.capacity
    trace.allocatedSeatCount =
      allocation.resource.kind === 'table' ? allocation.resource.capacity : arrival.partySize
    const orderTime = arrival.time + config.business.orderMinutes
    trace.orderTime = orderTime
    if (orderTime > closing) {
      rejectedLastOrderGroups += 1
      rejectedLastOrderPeople += arrival.partySize
      trace.outcome = 'lastOrder'
      trace.releaseTime = orderTime
      releaseAt(allocation, orderTime)
      seatingIntervals.push({
        start: arrival.time,
        end: orderTime,
        people: arrival.partySize,
        resourceUnits: allocation.allocatedSeatCount,
      })
      latestRelease = Math.max(latestRelease, orderTime)
      if (includeTraces) traces.push(trace)
      continue
    }

    trace.outcome = 'accepted'
    acceptedGroups += 1
    acceptedPeople += arrival.partySize
    const serviceTimes: number[] = []
    for (let guest = 0; guest < arrival.partySize; guest += 1) {
      let slotIndex = 0
      for (let index = 1; index < kitchenSlots.length; index += 1) {
        if ((kitchenSlots[index] ?? 0) < (kitchenSlots[slotIndex] ?? 0)) slotIndex = index
      }
      const availableAt = kitchenSlots[slotIndex] ?? 0
      const start = Math.max(orderTime, availableAt)
      const cookMinutes =
        mode === 'saturated'
          ? config.kitchen.cookMeanMinutes
          : uniformAround(
              config.kitchen.cookMeanMinutes,
              config.kitchen.cookVariationMinutes,
              random,
            )
      const service = start + cookMinutes
      kitchenSlots[slotIndex] = service
      kitchenIntervals.push({ start, end: service })
      if (start > orderTime) queueIntervals.push({ start: orderTime, end: start })
      serviceTimes.push(service)
      serviceWaits.push(service - orderTime)

      const price =
        mode === 'saturated'
          ? config.pricing.meanPerPerson
          : uniformAround(config.pricing.meanPerPerson, config.pricing.variation, random)
      revenue += Math.max(0, price)
    }

    const sharedMealStart = Math.max(...serviceTimes)
    const mealStartTimes = serviceTimes.map((service) =>
      config.kitchen.waitForAllMeals ? sharedMealStart : service,
    )
    const mealFinishTimes = mealStartTimes.map((mealStart) => {
      const diningMinutes =
        mode === 'saturated'
          ? config.kitchen.diningMeanMinutes
          : uniformAround(
              config.kitchen.diningMeanMinutes,
              config.kitchen.diningVariationMinutes,
              random,
            )
      return mealStart + diningMinutes
    })
    const releaseTime =
      Math.max(...mealFinishTimes) + config.business.checkoutMinutes + config.business.cleanupMinutes
    releaseAt(allocation, releaseTime)
    seatingIntervals.push({
      start: arrival.time,
      end: releaseTime,
      people: arrival.partySize,
      resourceUnits: allocation.allocatedSeatCount,
    })
    stays.push(releaseTime - arrival.time)
    latestRelease = Math.max(latestRelease, releaseTime)
    Object.assign(trace, { serviceTimes, mealStartTimes, mealFinishTimes, releaseTime })
    if (includeTraces) traces.push(trace)
  }

  const rejectedPeople = rejectedFullPeople + rejectedOversizePeople + rejectedLastOrderPeople
  const seatingResourceBusy = seatingIntervals.reduce(
    (sum, interval) => sum + clippedDuration(interval, closing) * (interval.resourceUnits ?? 1),
    0,
  )
  const occupiedSeats = seatingIntervals.reduce(
    (sum, interval) => sum + clippedDuration(interval, closing) * (interval.people ?? 0),
    0,
  )
  const kitchenBusy = kitchenIntervals.reduce((sum, interval) => sum + clippedDuration(interval, closing), 0)
  const totalSeats = totalSeatCount(config)
  const tableDenominator = seatingResourceUnitCount(config) * closing
  const seatDenominator = totalSeats * closing
  const kitchenDenominator = kitchenSlots.length * closing

  return {
    day: {
      revenue: Math.max(0, revenue),
      arrivedGroups: arrivals.length,
      arrivedPeople: arrivals.reduce((sum, arrival) => sum + arrival.partySize, 0),
      acceptedGroups,
      acceptedPeople,
      rejectedFullGroups,
      rejectedFullPeople,
      rejectedOversizeGroups,
      rejectedOversizePeople,
      rejectedLastOrderGroups,
      rejectedLastOrderPeople,
      lostRevenue: Math.max(0, rejectedPeople * config.pricing.meanPerPerson),
      averageServiceWait: mean(serviceWaits),
      maxServiceWait: serviceWaits.length ? Math.max(...serviceWaits) : 0,
      averageStay: mean(stays),
      maxStay: stays.length ? Math.max(...stays) : 0,
      tableUtilization: clampRate(
        tableDenominator > 0 ? seatingResourceBusy / tableDenominator : 0,
      ),
      seatUtilization: clampRate(seatDenominator > 0 ? occupiedSeats / seatDenominator : 0),
      kitchenUtilization: clampRate(kitchenDenominator > 0 ? kitchenBusy / kitchenDenominator : 0),
      overtimeMinutes: Math.max(0, latestRelease - closing),
      maxKitchenQueue: maximumConcurrentQueue(queueIntervals),
    },
    traces,
  }
}

export function simulateDay(
  config: SimulatorConfig,
  random: RandomSource,
  options: SimulateOptions = {},
): DayResult {
  return simulateDayCore(config, random, options, false).day
}

export function simulateDayDetailed(
  config: SimulatorConfig,
  random: RandomSource,
  options: SimulateOptions = {},
): CoreResult {
  return simulateDayCore(config, random, options, true)
}

function trialSeed(seed: number, trial: number, salt: number): number {
  return (seed ^ Math.imul(trial + 1, 0x9e3779b1) ^ salt) >>> 0
}

export function runAnalysis(
  config: SimulatorConfig,
  onProgress?: (percentage: number) => void,
): AnalysisResult {
  const normalDays: DayResult[] = []
  const saturatedDays: DayResult[] = []
  const progressStep = Math.max(1, Math.floor(config.trials / 100))
  for (let trial = 0; trial < config.trials; trial += 1) {
    normalDays.push(simulateDay(config, mulberry32(trialSeed(config.seed, trial, 0x243f6a88))))
    if (trial % progressStep === 0) onProgress?.((trial / config.trials) * 70)
  }
  for (let trial = 0; trial < config.trials; trial += 1) {
    saturatedDays.push(
      simulateDay(config, mulberry32(trialSeed(config.seed, trial, 0xb7e15162)), {
        mode: 'saturated',
      }),
    )
    if (trial % progressStep === 0) onProgress?.(70 + (trial / config.trials) * 30)
  }
  const summary = summarizeDays(normalDays)
  const saturatedAveragePeople = mean(saturatedDays.map((day) => day.acceptedPeople))
  const capacityRevenue = Math.max(0, saturatedAveragePeople * config.pricing.meanPerPerson)
  const capacityConsumptionRate = capacityRevenue > 0 ? summary.averageRevenue / capacityRevenue : 0
  onProgress?.(100)
  return {
    normalDays,
    saturatedDays,
    summary,
    saturatedAveragePeople,
    capacityRevenue,
    capacityConsumptionRate,
    bottlenecks: detectBottlenecks(summary),
  }
}
