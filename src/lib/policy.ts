// Centre rules in one place. The README "How the centre works" section mirrors these.

/** Lessons run Monday to Saturday from 08:00 to 20:00 (Lagos time). */
export const OPEN_HOUR = 8
export const CLOSE_HOUR = 20

/** Cancelling at least this many hours ahead returns the hours to the package. */
export const FREE_CANCELLATION_HOURS = 24

/** A package can be used for this many days after purchase. Unused hours lapse with it. */
export const PACKAGE_VALID_DAYS = 90

/** Students under this many hours are flagged on the dashboard. */
export const LOW_BALANCE_HOURS = 2

export const LESSON_DURATIONS = [30, 40, 45, 60, 90, 120] as const

export const PACKAGE_OPTIONS = [
  { hours: 5, price: 3_500_000 },
  { hours: 10, price: 6_500_000 },
  { hours: 20, price: 12_000_000 },
] as const
