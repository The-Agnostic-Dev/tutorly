import { describe, expect, it } from 'vitest'
import * as time from '@/lib/time'
const { addDays, monthBounds, openDays, recentMonths, toUtcIso, weekStart, weekday } = time

describe('Lagos dates', () => {
  it('converts Lagos wall-clock time to UTC', () => {
    expect(toUtcIso('2026-11-05', '16:00')).toBe('2026-11-05T15:00:00.000Z')
    expect(toUtcIso('2026-11-05', '00:30')).toBe('2026-11-04T23:30:00.000Z')
  })

  it('finds the Monday of a week', () => {
    expect(weekStart('2026-11-05')).toBe('2026-11-02')
    expect(weekStart('2026-11-02')).toBe('2026-11-02')
    expect(weekStart('2026-11-08')).toBe('2026-11-02')
  })

  it('lists the six open days', () => {
    const days = openDays('2026-11-02')
    expect(days).toHaveLength(6)
    expect(days[5]).toBe('2026-11-07')
    expect(weekday(days[5])).toBe(6)
  })

  it('names the days of the open week from their dates', () => {
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    expect(names[weekday('2024-09-02')]).toBe('Mon')
    expect(names[weekday('2024-09-07')]).toBe('Sat')
    expect(openDays('2024-09-02').map((d) => names[weekday(d)])).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'])
  })

  it('adds days across month ends', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('gives month bounds in UTC', () => {
    expect(monthBounds('2026-12')).toEqual({ from: '2026-11-30T23:00:00.000Z', to: '2026-12-31T23:00:00.000Z' })
  })

  it('lists recent months newest first', () => {
    expect(recentMonths('2026-01-15', 3)).toEqual(['2026-01', '2025-12', '2025-11'])
  })
})
