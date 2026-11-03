import { describe, expect, it } from 'vitest'
import { formatDuration, formatHours } from '@/lib/hours'

describe('hours', () => {
  it('formats lesson lengths', () => {
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(60)).toBe('1 h')
    expect(formatDuration(90)).toBe('1 h 30 min')
  })

  it('formats package balances', () => {
    expect(formatHours(2.5)).toBe('2.50 h')
    expect(formatHours(17)).toBe('17.00 h')
  })
})
