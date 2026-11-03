'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { cancelLessonAction } from '@/app/(app)/lessons/actions'

type Props = { lessonId: number; cancellable: boolean; returnsHours: boolean }

export function CancelLessonButton({ lessonId, cancellable, returnsHours }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function cancel() {
    if (!window.confirm('Cancel this lesson?')) return
    setError(null)
    startTransition(async () => {
      try {
        await cancelLessonAction(lessonId)
        setDone(true)
        router.refresh()
      } catch {
        setError('Something went wrong. Please try again.')
      }
    })
  }

  if (done) {
    return (
      <p className="notice ok" role="status">
        Lesson cancelled.{returnsHours ? ' The hours have gone back on the package.' : ''}
      </p>
    )
  }
  if (!cancellable) return null

  return (
    <>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      <button className="btn danger" type="button" onClick={cancel} disabled={pending}>
        {pending ? 'Cancelling...' : 'Cancel lesson'}
      </button>
    </>
  )
}
