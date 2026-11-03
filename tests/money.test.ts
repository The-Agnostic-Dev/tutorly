import { describe, expect, it } from 'vitest'
import { formatNaira, parseNaira } from '@/lib/money'

describe('formatNaira', () => {
  it('formats kobo as naira with two decimals', () => {
    expect(formatNaira(1_250_000)).toBe('₦12,500.00')
    expect(formatNaira(5)).toBe('₦0.05')
  })
})

describe('parseNaira', () => {
  it('reads plain and comma-grouped amounts', () => {
    expect(parseNaira('7500')).toBe(750_000)
    expect(parseNaira('7,500.50')).toBe(750_050)
    expect(parseNaira('₦ 6,000')).toBe(600_000)
  })

  it('rejects text that is not an amount', () => {
    expect(parseNaira('seven thousand')).toBeNull()
    expect(parseNaira('')).toBeNull()
  })
})
