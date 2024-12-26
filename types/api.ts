import { ParticipantData } from './movie'

export type ParticipantsMovieData = {
  participantsData: ParticipantData[]
  timeAvailable: string
}

export type MovieRecord = {
  id: number
  content: string
  similarity: number
}

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
