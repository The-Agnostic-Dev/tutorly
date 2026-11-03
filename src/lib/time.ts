// The centre is in Lagos (WAT, UTC+1, no daylight saving). Lesson times are stored as UTC ISO
// strings; calendar dates ("2026-11-05") are always Lagos dates.

export const TIME_ZONE = 'Africa/Lagos'
const LAGOS_OFFSET = '+01:00'

const dateFormat = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' })
const timeFormat = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const longDateFormat = new Intl.DateTimeFormat('en-GB', { timeZone: TIME_ZONE, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
const monthFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', month: 'long', year: 'numeric' })

/** Lagos calendar date for an instant, as YYYY-MM-DD. */
export function lagosDate(at: Date = new Date()): string {
  return dateFormat.format(at)
}

/** Lagos wall-clock time for an instant, as HH:mm. */
export function lagosTime(at: Date): string {
  return timeFormat.format(at)
}

/** UTC ISO string for a Lagos date and HH:mm time. */
export function toUtcIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00${LAGOS_OFFSET}`).toISOString()
}

function utcNoon(date: string): Date {
  return new Date(`${date}T12:00:00Z`)
}

export function addDays(date: string, days: number): string {
  const d = utcNoon(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** 0 = Sunday ... 6 = Saturday */
export function weekday(date: string): number {
  return utcNoon(date).getUTCDay()
}

/** The Monday of the week containing `date`. */
export function weekStart(date: string): string {
  const day = weekday(date)
  return addDays(date, day === 0 ? -6 : 1 - day)
}

/** Monday to Saturday, the days the centre is open. */
export function openDays(monday: string): string[] {
  return Array.from({ length: 6 }, (_, i) => addDays(monday, i))
}

export function dayOfMonth(date: string): number {
  return utcNoon(date).getUTCDate()
}

export function formatDate(iso: string): string {
  return longDateFormat.format(new Date(iso))
}

export function formatDateTime(iso: string): string {
  const at = new Date(iso)
  return `${longDateFormat.format(at)}, ${lagosTime(at)}`
}

export function formatMonth(month: string): string {
  return monthFormat.format(new Date(`${month}-01T12:00:00Z`))
}

/** UTC bounds of a Lagos calendar month ("2026-11"), end exclusive. */
export function monthBounds(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number)
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
  return { from: toUtcIso(`${month}-01`, '00:00'), to: toUtcIso(`${next}-01`, '00:00') }
}

/** The month a Lagos date falls in, plus the `count - 1` months before it, newest first. */
export function recentMonths(today: string, count: number): string[] {
  const [y, m] = today.split('-').map(Number)
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - i, 1))
    return d.toISOString().slice(0, 7)
  })
}

export function hoursUntil(iso: string, now: Date = new Date()): number {
  return (new Date(iso).getTime() - now.getTime()) / 3_600_000
}
