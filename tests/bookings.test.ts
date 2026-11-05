import { beforeEach, describe, expect, it } from 'vitest'
import { getLesson } from '@/lib/data/lessons'
import { upcomingLessons } from '@/lib/data/students'
import { packagesForStudent } from '@/lib/data/packages'
import { bookLesson, cancelLesson, checkSlot, validateSlot, type BookingRequest } from '@/lib/services/bookings'
import { admin, freshCentre, parent, withPackage } from './fixtures'

// Wednesday 4 November 2026, 09:00 in Lagos
const NOW = new Date('2026-11-04T08:00:00.000Z')

function request(overrides: Partial<BookingRequest> = {}): BookingRequest {
  return { studentId: 1, tutorId: 1, subjectId: 1, date: '2026-11-06', time: '16:00', durationMin: 60, ...overrides }
}

describe('validateSlot', () => {
  beforeEach(() => {
    freshCentre()
  })

  it('accepts a normal afternoon lesson', () => {
    expect(validateSlot(request(), NOW)).toBeNull()
  })

  it('refuses Sundays, late finishes and the past', () => {
    expect(validateSlot(request({ date: '2026-11-08' }), NOW)).toMatch(/Sundays/)
    expect(validateSlot(request({ time: '19:30' }), NOW)).toMatch(/between/)
    expect(validateSlot(request({ date: '2026-11-03' }), NOW)).toMatch(/passed/)
  })

  it('refuses a subject the tutor does not teach', () => {
    expect(validateSlot(request({ subjectId: 2 }), NOW)).toMatch(/does not teach/)
  })
})

describe('booking and cancelling', () => {
  beforeEach(() => {
    freshCentre()
  })

  it('draws the lesson from the package', () => {
    withPackage(10, '2026-10-20')
    const result = bookLesson(request({ durationMin: 90 }), NOW)
    expect(result.ok).toBe(true)
    expect(packagesForStudent(1)[0].hoursRemaining).toBe(8.5)
  })

  it('bills pay as you go when there is no package', () => {
    const result = bookLesson(request(), NOW)
    expect(result).toMatchObject({ ok: true, packageId: null })
  })

  it('refuses when the package is short', () => {
    withPackage(0.5, '2026-10-20')
    const result = bookLesson(request(), NOW)
    expect(result).toMatchObject({ ok: false })
  })

  it('shows a clash while the form is being filled in', () => {
    bookLesson(request(), NOW)
    expect(checkSlot(request({ time: '16:30', studentId: 1 }), NOW)).toMatchObject({ ok: false })
    expect(checkSlot(request({ time: '17:00' }), NOW)).toEqual({ ok: true })
  })

  it('returns hours when cancelled two days ahead', () => {
    withPackage(10, '2026-10-20')
    const booked = bookLesson(request(), NOW)
    if (!booked.ok) throw new Error(booked.message)
    expect(cancelLesson(booked.lessonId, parent, NOW)).toEqual({ ok: true, hoursReturned: true })
    expect(packagesForStudent(1)[0].hoursRemaining).toBe(10)
    expect(getLesson(booked.lessonId)?.status).toBe('cancelled')
  })

  it('keeps the hours on a late cancellation by the centre', () => {
    withPackage(10, '2026-10-20')
    const booked = bookLesson(request({ date: '2026-11-04', time: '15:00' }), NOW)
    if (!booked.ok) throw new Error(booked.message)
    expect(cancelLesson(booked.lessonId, admin, NOW)).toEqual({ ok: true, hoursReturned: false })
    expect(packagesForStudent(1)[0].hoursRemaining).toBe(9)
  })
})

describe('upcomingLessons ordering', () => {
  beforeEach(() => {
    freshCentre()
  })

  it('returns booked lessons in chronological order', () => {
    const first = bookLesson(request({ date: '2026-11-07', time: '16:00' }), NOW)
    const second = bookLesson(request({ date: '2026-11-05', time: '15:00' }), NOW)
    const third = bookLesson(request({ date: '2026-11-06', time: '17:00' }), NOW)
    expect(first.ok).toBe(true)
    expect(second.ok).toBe(true)
    expect(third.ok).toBe(true)

    const lessons = upcomingLessons(1)
    const starts = lessons.map(l => l.startsAt)
    expect(starts).toEqual([...starts].sort())
  })
})
