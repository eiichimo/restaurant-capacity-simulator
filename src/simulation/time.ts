export function timeToDayMinutes(value: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return Number.NaN
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return Number.NaN
  return hours * 60 + minutes
}

export function toBusinessMinutes(value: string, openTime: string): number {
  return timeToDayMinutes(value) - timeToDayMinutes(openTime)
}

export function formatClockFromBusiness(minutes: number, openTime: string): string {
  const total = Math.round(timeToDayMinutes(openTime) + minutes)
  const hours = Math.floor(total / 60) % 24
  const mins = ((total % 60) + 60) % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
}
