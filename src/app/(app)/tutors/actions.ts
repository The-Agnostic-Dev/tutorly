'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { saveTutor } from '@/lib/data/tutors'
import { parseNaira } from '@/lib/money'

export type TutorFormState = { error?: string }

export async function updateTutor(id: number, _prev: TutorFormState, formData: FormData): Promise<TutorFormState> {
  await requireUser(['admin'])
  const name = String(formData.get('name') ?? '').trim()
  const hourlyRate = parseNaira(String(formData.get('hourlyRate') ?? ''))
  const bio = String(formData.get('bio') ?? '').trim()
  const subjectIds = formData.getAll('subjects').map(Number).filter(Boolean)

  if (!name) return { error: "Enter the tutor's name." }
  if (hourlyRate === null || hourlyRate <= 0) return { error: 'Enter the hourly rate in naira, for example 7,500.' }

  saveTutor(id, { name, hourlyRate, bio, subjectIds })
  revalidatePath('/tutors')
  revalidatePath(`/tutors/${id}`)
  redirect(`/tutors?saved=${id}`)
}
