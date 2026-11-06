import { describe, expect, it, vi } from 'vitest'
import { freshCentre } from './fixtures'
import { getTutorDirectory, saveTutor } from '@/lib/data/tutors'
import { revalidateTag } from 'next/cache'

vi.mock('next/cache', () => {
  type CacheEntry = { value: unknown; tags: string[] }
  const cache = new Map<string, CacheEntry>()

  return {
    unstable_cache: (fn: (...args: any[]) => Promise<any>, keys: string[], options?: { tags?: string[] }) => {
      const key = keys.join('|')
      return async (...args: any[]) => {
        if (!cache.has(key)) {
          const value = await fn(...args)
          cache.set(key, { value, tags: options?.tags ?? [] })
        }
        return cache.get(key)!.value
      }
    },
    revalidateTag: vi.fn((tag: string) => {
      for (const [key, entry] of cache) {
        if (entry.tags.includes(tag)) cache.delete(key)
      }
    }),
  }
})

describe('tutor directory', () => {
  it('shows a newly assigned subject after saving a tutor and invalidates the tutors cache tag', async () => {
    const db = freshCentre()
    db.prepare("INSERT INTO subjects (id, name) VALUES (3, 'Economics')").run()

    const before = await getTutorDirectory()
    expect(before.find((t) => t.id === 1)?.subjectIds).toEqual([1])

    saveTutor(1, { name: 'Emeka Bello', hourlyRate: 750_000, bio: '', subjectIds: [1, 3] })

    const after = await getTutorDirectory()
    const tutor = after.find((t) => t.id === 1)
    expect(tutor?.subjectIds).toContain(3)
    expect(tutor?.subjects).toContain('Economics')
    expect(revalidateTag).toHaveBeenCalledWith('tutors')
  })
})
