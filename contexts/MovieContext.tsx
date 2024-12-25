'use client';
import { MovieRecommendation } from '@/lib/utils/movie';
import { createContext, useContext, ReactNode, useState } from 'react';

type ParticipantData = {
  favouriteMovie: string;
  mood: string;
  preference: string;
};

type MovieContextType = {
  participantsData: ParticipantData[];
  recommendations: MovieRecommendation | null;
  timeAvailable: string;
  setParticipantsData: (data: ParticipantData[]) => void;
  setRecommendations: (data: MovieRecommendation) => void;
  setGroupTimeAvailable: (time: string) => void;
};

const MovieContext = createContext<MovieContextType | undefined>(undefined);

export function MovieProvider({ children }: { children: ReactNode }) {
  const [participantsData, setParticipantsData] = useState<ParticipantData[]>([]);
  const [recommendations, setRecommendations] = useState<MovieRecommendation | null>(null);
  const [timeAvailable, setGroupTimeAvailable] = useState<string>('');

  return (
    <MovieContext.Provider value={{ 
      participantsData, 
      recommendations, 
      timeAvailable,
      setParticipantsData, 
      setRecommendations,
      setGroupTimeAvailable
    }}>
      {children}
    </MovieContext.Provider>
  );
}

export function useMovieContext() {
  const context = useContext(MovieContext);
  if (context === undefined) {
    throw new Error('useMovie must be used within a MovieProvider');
  }
  return context;
}