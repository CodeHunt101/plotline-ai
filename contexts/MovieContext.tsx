'use client';
import { MovieRecommendation } from '@/lib/utils/movie';
import { createContext, useContext, ReactNode, useState } from 'react';


type MovieContextType = {
  recommendation: MovieRecommendation | null;
  setRecommendation: (data: MovieRecommendation) => void;
};

const MovieContext = createContext<MovieContextType | undefined>(undefined);

export function MovieProvider({ children }: { children: ReactNode }) {
  const [recommendation, setRecommendation] = useState<MovieRecommendation | null>(null);

  return (
    <MovieContext.Provider value={{ recommendation, setRecommendation }}>
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
