'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { createPackage } from '@/lib/data/packages'
import { PACKAGE_OPTIONS } from '@/lib/policy'
import { lagosDate } from '@/lib/time'

export async function sellPackage(formData: FormData) {
  await requireUser(['admin'])
  const studentId = Number(formData.get('studentId'))
  const option = PACKAGE_OPTIONS.find((o) => o.hours === Number(formData.get('hours')))
  if (!studentId || !option) redirect(`/packages/new?student=${studentId || ''}&error=1`)
  createPackage(studentId, option.hours, option.price, lagosDate())
  revalidatePath(`/students/${studentId}`)
  redirect(`/students/${studentId}?sold=1`)
}
