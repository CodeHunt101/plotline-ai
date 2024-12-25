import { createEmbedding } from '@/services/openai'
import { findNearestMatch, MovieRecord } from '@/services/supabase'
import { getChatCompletion } from '@/services/openai'
import { ParticipantData } from '@/app/(routes)/page'

export type MovieRecommendation = {
  match: Partial<MovieRecord>[]
  result: {
    recommendedMovies: {
      name: string
      releaseYear: string
      synopsis: string
    }[]
  }
}

export type ParticipantsMovieData = {
  participantsData: ParticipantData[]
  timeAvailable: string
}

export const getMovieRecommendation = async (
  movieData: ParticipantsMovieData
): Promise<MovieRecommendation> => {
  try {
    const embeddingInput = movieData.participantsData
      .map(
        (data, index) => 
          `Participant ${index + 1}:\nFavorite movie: ${data.favouriteMovie}\nMood: ${data.mood}\nPreference: ${data.preference}\n`
      )
      .join('\n') + `\nTime available: ${movieData.timeAvailable}`

    const embedding = await createEmbedding(embeddingInput)
    const match = await findNearestMatch(embedding)
    if (match.length === 0) {
      return {
        match: [],
        result: {recommendedMovies: []},
      }
    }
    const result =
      (await getChatCompletion(
        match.map( (movie, index) => `Movie ${index + 1}: ${movie.content}`).join('\n\n'),
        embeddingInput
      )) || 'Sorry, I could not find any relevant information about that.'
    return { match, result: JSON.parse(result) }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('An unknown error occurred')
  }
}

export function extractSynopses(text: string) {
  // Split by 'Movie X:' to separate entries
  const movies = text.split(/Movie \d+: [^\n]+\n/);
  
  // Filter out empty strings and trim results
  const synopses = movies.filter(Boolean).map(s => s.trim());
  
  return synopses;
}