import { MovieRecord } from '@/types/api'
import { supabase } from '../lib/config/supabase'

export async function findNearestMatch(
  embedding: number[]
): Promise<MovieRecord[]> {
  const { data } = await supabase.rpc('match_movies_4', {
    query_embedding: embedding,
    match_threshold: 0.3, // Lowered threshold for text-embedding-3-small
    match_count: 10,
  })

  if (!data || data.length === 0) {
    console.log('No matches found')
    return []
  }

  console.log(
    'Match scores:',
    data.map(
      (d: { id: number; content: string; similarity: number }) => d.similarity
    )
  )

  const match: MovieRecord[] = data
  return match
}
