'use client'
import { MovieRecommendation } from '@/types/api'
import { MovieContextType, ParticipantData } from '@/types/movie'
import { createContext, useContext, ReactNode, useState } from 'react'

export const MovieContext = createContext<MovieContextType | undefined>(
  undefined
)

export function MovieProvider({ children }: { children: ReactNode }) {
  const [participantsData, setParticipantsData] = useState<ParticipantData[]>(
    []
  )
  const [recommendations, setRecommendations] =
    useState<MovieRecommendation | null>(null)
  const [timeAvailable, setGroupTimeAvailable] = useState<string>('')
  const [totalParticipants, setTotalParticipants] = useState<number>(1)

  return (
    <MovieContext.Provider
      value={{
        participantsData,
        recommendations,
        timeAvailable,
        totalParticipants,
        setParticipantsData,
        setRecommendations,
        setGroupTimeAvailable,
        setTotalParticipants,
      }}
    >
      {children}
    </MovieContext.Provider>
  )
}

export function useMovieContext() {
  const context = useContext(MovieContext)
  if (context === undefined) {
    throw new Error('useMovie must be used within a MovieProvider')
  }
  return context
}
