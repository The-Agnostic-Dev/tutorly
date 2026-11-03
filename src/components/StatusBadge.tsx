import type { LessonStatus } from '@/lib/data/lessons'

const LABELS: Record<LessonStatus, string> = { booked: 'Booked', completed: 'Taught', cancelled: 'Cancelled' }

export function StatusBadge({ status }: { status: LessonStatus }) {
  return (
    <span className={`badge ${status}`} data-testid="lesson-status">
      {LABELS[status]}
    </span>
  )
}
