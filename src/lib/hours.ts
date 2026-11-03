export function formatHours(hours: number): string {
  return `${hours.toFixed(2)} h`
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

export function minutesToHours(minutes: number): number {
  return minutes / 60
}
