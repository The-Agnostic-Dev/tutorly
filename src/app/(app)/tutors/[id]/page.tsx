import { notFound } from 'next/navigation'
import { TutorForm } from '@/components/TutorForm'
import { requireUser } from '@/lib/auth'
import { getTutor, listSubjects } from '@/lib/data/tutors'

export const metadata = { title: 'Edit tutor' }

export default async function EditTutorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(['admin'])
  const { id } = await params
  const tutor = getTutor(Number(id))
  if (!tutor) notFound()
  return (
    <>
      <h1>{tutor.name}</h1>
      <p className="lead">Subjects ticked here decide who parents can pick when booking.</p>
      <TutorForm tutor={tutor} subjects={listSubjects()} />
    </>
  )
}
