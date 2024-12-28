import { MovieRecord } from '@/types/api'
import { SUPABASE_WORKER_URL } from '../lib/config/supabase'

export async function findNearestMatch(
  embedding: number[]
): Promise<MovieRecord[]> {
  const response = await fetch(`${SUPABASE_WORKER_URL}/api/match-movies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ embedding }),
  })

  const { matches, error } = await response.json()

  if (error || !matches || matches.length === 0) {
    console.log('No matches found')
    return []
  }

  console.log(
    'Match scores:',
    matches.map((d: { similarity: number }) => d.similarity)
  )

  return matches
}
