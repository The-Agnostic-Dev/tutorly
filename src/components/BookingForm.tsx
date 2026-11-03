'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { bookLessonAction, checkSlotAction } from '@/app/(app)/lessons/actions'
import { formatDuration } from '@/lib/hours'
import { CLOSE_HOUR, LESSON_DURATIONS, OPEN_HOUR } from '@/lib/policy'

type Option = { id: number; name: string }
type Tutor = Option & { subjectIds: number[] }
type Slot = { state: 'idle' | 'checking' | 'free' | 'busy'; message?: string }

const TIMES: string[] = []
for (let h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
  TIMES.push(`${String(h).padStart(2, '0')}:00`, `${String(h).padStart(2, '0')}:30`)
}

type Props = { students: Option[]; subjects: Option[]; tutors: Tutor[]; today: string; initialStudent?: number }

export function BookingForm({ students, subjects, tutors, today, initialStudent }: Props) {
  const router = useRouter()
  const [studentId, setStudentId] = useState(initialStudent ? String(initialStudent) : '')
  const [subjectId, setSubjectId] = useState('')
  const [tutorId, setTutorId] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [duration, setDuration] = useState('60')
  const [slot, setSlot] = useState<Slot>({ state: 'idle' })
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const latest = useRef(0)

  const teaching = tutors.filter((t) => subjectId && t.subjectIds.includes(Number(subjectId)))
  const complete = Boolean(studentId && subjectId && tutorId && date && time && duration)

  useEffect(() => {
    if (tutorId && !teaching.some((t) => String(t.id) === tutorId)) setTutorId('')
  }, [subjectId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setError(null)
    if (!complete) {
      setSlot({ state: 'idle' })
      return
    }
    const ticket = ++latest.current
    setSlot({ state: 'checking' })
    checkSlotAction(request()).then((result) => {
      if (ticket !== latest.current) return
      setSlot(result.ok ? { state: 'free' } : { state: 'busy', message: result.message })
    })
  }, [studentId, subjectId, tutorId, date, time, duration]) // eslint-disable-line react-hooks/exhaustive-deps

  function request() {
    return {
      studentId: Number(studentId),
      subjectId: Number(subjectId),
      tutorId: Number(tutorId),
      date,
      time,
      durationMin: Number(duration),
    }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault()
    startTransition(async () => {
      const result = await bookLessonAction(request())
      if (result.ok) router.push(`/lessons/${result.lessonId}?booked=1`)
      else setError(result.message)
    })
  }

  const tutorName = tutors.find((t) => String(t.id) === tutorId)?.name

  return (
    <form className="card" onSubmit={submit}>
      <div className="row">
        <div className="field">
          <label htmlFor="student">Student</label>
          <select id="student" value={studentId} onChange={(e) => setStudentId(e.target.value)} required>
            <option value="">Choose...</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="subject">Subject</label>
          <select id="subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required>
            <option value="">Choose...</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="tutor">Tutor</label>
          <select id="tutor" value={tutorId} onChange={(e) => setTutorId(e.target.value)} required disabled={!subjectId}>
            <option value="">{subjectId && teaching.length === 0 ? 'Nobody teaches this yet' : 'Choose...'}</option>
            {teaching.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="row">
        <div className="field">
          <label htmlFor="date">Date</label>
          <input id="date" type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="field">
          <label htmlFor="time">Start time</label>
          <select id="time" value={time} onChange={(e) => setTime(e.target.value)} required>
            <option value="">Choose...</option>
            {TIMES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="duration">Length</label>
          <select id="duration" value={duration} onChange={(e) => setDuration(e.target.value)}>
            {LESSON_DURATIONS.map((d) => (
              <option key={d} value={d}>
                {formatDuration(d)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div data-testid="slot-status">
        {slot.state === 'checking' && <p className="notice info">Checking the timetable...</p>}
        {slot.state === 'free' && <p className="notice ok">{tutorName} is free at that time.</p>}
        {slot.state === 'busy' && <p className="notice error">{slot.message}</p>}
      </div>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}

      <button className="btn" type="submit" disabled={slot.state !== 'free' || pending}>
        {pending ? 'Booking...' : 'Book lesson'}
      </button>
      <p className="hint">
        Lessons are taken from the student&apos;s package when they have one. Otherwise they are billed on the monthly invoice.
      </p>
    </form>
  )
}
