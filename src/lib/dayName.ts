import { weekday } from '@/lib/time'

export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function dayName(date: string): string {
  return DAY_NAMES[weekday(date)]
}
