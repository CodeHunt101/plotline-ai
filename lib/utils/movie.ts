import { createEmbedding } from '@/services/openai'
import { findNearestMatch } from '@/services/supabase'
import { getChatCompletion } from '@/services/openai'
import { MovieRecommendation, ParticipantsMovieData } from '@/types/api'

export const getMovieRecommendation = async (
  movieData: ParticipantsMovieData
): Promise<MovieRecommendation> => {
  try {
    const embeddingInput =
      movieData.participantsData
        .map(
          (data, index) =>
            `Participant ${index + 1}:\nFavorite movie: ${
              data.favouriteMovie
            }\nI want to see: ${data.movieType} movies\nMood for: ${
              data.moodType
            } movies \nFavorite film person to be stranded on an island with: ${
              data.favouriteFilmPerson
            }\n`
        )
        .join('\n') +
      `\nTime available for all participants: ${movieData.timeAvailable}`

    const embedding = await createEmbedding(embeddingInput)
    const match = await findNearestMatch(embedding)
    if (match.length === 0) {
      return {
        match: [],
        result: { recommendedMovies: [] },
      }
    }
    const result =
      (await getChatCompletion(
        match
          .map((movie, index) => `Movie ${index + 1}: ${movie.content}`)
          .join('\n\n'),
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
