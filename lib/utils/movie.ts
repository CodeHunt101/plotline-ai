import { createEmbedding } from '@/services/openai'
import { findNearestMatch, MovieRecord } from '@/services/supabase'
import { getChatCompletion } from '@/services/openai'

type MovieData = {
  favouriteMovie: string
  mood: string
  preference: string
}

export type MovieRecommendation = {
  match: Partial<MovieRecord>
  result: string
}

export const getMovieRecommendation = async (
  movieData: MovieData
): Promise<MovieRecommendation> => {
  try {
    const embedding = await createEmbedding(
      `Favorite movie: ${movieData.favouriteMovie}\nMood: ${movieData.mood}\nPreference: ${movieData.preference}`
    )
    const match = await findNearestMatch(embedding)
    console.log({ match })
    if (match.content === 'No matches found') {
      return {
        match: {},
        result: 'Sorry, I could not find any relevant information about that.',
      }
    }
    const result =
      (await getChatCompletion(
        match.content ?? 'No matches found',
        `Favorite movie: ${movieData.favouriteMovie}\nMood: ${movieData.mood}\nPreference: ${movieData.preference}`
      )) || 'Sorry, I could not find any relevant information about that.'
    return { match, result }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('An unknown error occurred')
  }
}
