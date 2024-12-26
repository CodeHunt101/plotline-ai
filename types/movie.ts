import { MOOD_TYPES, MOVIE_TYPES } from '@/constants/movies'
import { MovieRecommendation } from './api'

export type ParticipantData = {
  favouriteMovie: string
  movieType: 'new' | 'classic'
  moodType: 'fun' | 'serious' | 'inspiring' | 'scary'
  favouriteFilmPerson: string
}

export type MovieContextType = {
  participantsData: ParticipantData[]
  recommendations: MovieRecommendation | null
  timeAvailable: string
  totalParticipants: number
  showParticipantSelect: boolean
  setParticipantsData: (data: ParticipantData[]) => void
  setRecommendations: (data: MovieRecommendation) => void
  setGroupTimeAvailable: (time: string) => void
  setTotalParticipants: (total: number) => void
  setShowParticipantSelect: (show: boolean) => void
}

export type MovieType = (typeof MOVIE_TYPES)[number]
export type MoodType = (typeof MOOD_TYPES)[number]

export interface MovieFormData extends ParticipantData {
  movieType: MovieType
  moodType: MoodType
}
