import { supabase } from "../lib/config/supabase"

export async function findNearestMatch(embedding: number[]) {
  const { data } = await supabase.rpc('match_movies_3', {
    query_embedding: embedding,
    match_threshold: 0.1, // Lowered threshold for text-embedding-3-small
    match_count: 1,
  })

  if (!data || data.length === 0) {
    console.log('No matches found')
    return ''
  }

  console.log(
    'Match scores:',
    data.map((d: {id: number, content: string, similarity: number}) => d.similarity)
  )
  const match = data.map((obj: { content: {id: number, content: string, similarity: number}; }) => obj.content).join('\n')
  return match
}