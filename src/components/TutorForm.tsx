'use client'

import { useActionState } from 'react'
import { updateTutor, type TutorFormState } from '@/app/(app)/tutors/actions'

type Props = {
  tutor: { id: number; name: string; hourlyRate: number; bio: string; subjectIds: number[] }
  subjects: Array<{ id: number; name: string }>
}

export function TutorForm({ tutor, subjects }: Props) {
  const [state, action, pending] = useActionState<TutorFormState, FormData>(updateTutor.bind(null, tutor.id), {})
  return (
    <form className="card" action={action}>
      <div className="row">
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" defaultValue={tutor.name} required />
        </div>
        <div className="field">
          <label htmlFor="hourlyRate">Hourly rate (₦)</label>
          <input id="hourlyRate" name="hourlyRate" inputMode="decimal" defaultValue={(tutor.hourlyRate / 100).toFixed(2)} required />
        </div>
      </div>
      <div className="field">
        <label htmlFor="bio">About</label>
        <textarea id="bio" name="bio" rows={3} defaultValue={tutor.bio} />
      </div>
      <fieldset className="field" style={{ border: 'none', padding: 0 }}>
        <legend style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.3rem" }}>Subjects taught</legend>
        <div className="checks">
          {subjects.map((s) => (
            <label key={s.id}>
              <input type="checkbox" name="subjects" value={s.id} defaultChecked={tutor.subjectIds.includes(s.id)} />
              {s.name}
            </label>
          ))}
        </div>
      </fieldset>
      {state.error && <p className="notice error">{state.error}</p>}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? 'Saving...' : 'Save tutor'}
      </button>
    </form>
  )
}
