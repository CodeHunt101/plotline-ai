import { supabase } from "../lib/config/supabase"

export type MovieRecord = {
  id: number;
  content: string;
  similarity: number;
  release_year: number;
  title: string;
};

export async function findNearestMatch(embedding: number[]): Promise<Partial<MovieRecord>> {
  const { data } = await supabase.rpc('match_movies_3', {
    query_embedding: embedding,
    match_threshold: 0.3, // Lowered threshold for text-embedding-3-small
    match_count: 1,
  })

  if (!data || data.length === 0) {
    console.log('No matches found')
    return {content: 'No matches found'}
  }

  console.log(
    'Match scores:',
    data.map((d: {id: number, content: string, similarity: number}) => d.similarity)
  )

  const match: MovieRecord = data[0]
  console.log({match})
  return match
}
