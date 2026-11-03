'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type DirectoryEntry = { id: number; name: string; subjects: string[] }

export function TutorFilter({ week, selected }: { week: string; selected?: string }) {
  const router = useRouter()
  const [tutors, setTutors] = useState<DirectoryEntry[]>([])

  useEffect(() => {
    let live = true
    fetch('/api/tutors')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: DirectoryEntry[]) => live && setTutors(data))
    return () => {
      live = false
    }
  }, [])

  return (
    <div className="field" style={{ maxWidth: 420 }}>
      <label htmlFor="tutor-filter">Show lessons for</label>
      <select
        id="tutor-filter"
        value={selected ?? ''}
        onChange={(e) => {
          const params = new URLSearchParams({ week })
          if (e.target.value) params.set('tutor', e.target.value)
          router.push(`/calendar?${params}`)
        }}
      >
        <option value="">All tutors</option>
        {tutors.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} ({t.subjects.join(', ') || 'no subjects yet'})
          </option>
        ))}
      </select>
    </div>
  )
}
