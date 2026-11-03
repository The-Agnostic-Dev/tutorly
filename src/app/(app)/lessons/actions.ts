'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth'
import { getLesson, markCompleted } from '@/lib/data/lessons'
import { studentsForParent } from '@/lib/data/students'
import { bookLesson, cancelLesson, checkSlot, type BookingRequest, type Outcome } from '@/lib/services/bookings'

function clean(req: BookingRequest): BookingRequest {
  return {
    studentId: Number(req.studentId),
    tutorId: Number(req.tutorId),
    subjectId: Number(req.subjectId),
    date: String(req.date),
    time: String(req.time),
    durationMin: Number(req.durationMin),
  }
}

async function mayBookFor(studentId: number): Promise<boolean> {
  const user = await requireUser(['admin', 'parent'])
  return user.role === 'admin' || studentsForParent(user.id).some((s) => s.id === studentId)
}

export async function checkSlotAction(input: BookingRequest): Promise<Outcome> {
  const req = clean(input)
  if (!(await mayBookFor(req.studentId))) return { ok: false, message: 'Choose one of your children.' }
  return checkSlot(req)
}

export async function bookLessonAction(input: BookingRequest): Promise<Outcome<{ lessonId: number }>> {
  const req = clean(input)
  if (!(await mayBookFor(req.studentId))) return { ok: false, message: 'Choose one of your children.' }
  const result = bookLesson(req)
  if (result.ok) {
    revalidatePath('/calendar')
    revalidatePath(`/students/${req.studentId}`)
  }
  return result
}

export async function cancelLessonAction(lessonId: number): Promise<Outcome<{ hoursReturned: boolean }>> {
  const user = await requireUser()
  const result = cancelLesson(lessonId, user)
  if (result.ok) {
    revalidatePath('/calendar')
    revalidatePath(`/lessons/${lessonId}`)
  }
  return result
}

export async function completeLessonAction(lessonId: number) {
  const user = await requireUser(['admin', 'tutor'])
  const lesson = getLesson(lessonId)
  if (!lesson) return
  if (user.role === 'tutor' && lesson.tutorId !== user.tutorId) return
  markCompleted(lessonId)
  revalidatePath(`/lessons/${lessonId}`)
}
