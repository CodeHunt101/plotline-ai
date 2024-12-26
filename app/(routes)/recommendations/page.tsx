'use client'

import { useMovieContext } from '@/contexts/MovieContext'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function Recommendations() {
  const { recommendations } = useMovieContext()
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (!recommendations) {
      router.push('/')
    }
  }, [recommendations, router])

  if (!recommendations) {
    return null
  }

  const handleNextMovie = () => {
    // If we're at the last movie, go back to the first one
    if (currentIndex === recommendations.result.recommendedMovies.length - 1) {
      setCurrentIndex(0)
    } else {
      // Otherwise, move to the next movie
      setCurrentIndex(currentIndex + 1)
    }
  }

  const currentMovie = recommendations.result.recommendedMovies[currentIndex]

  return (
    <div className="mt-6">
      {currentMovie?.name && (
        <div className="text-3xl mt-12">
          {`${currentMovie.name} (${currentMovie.releaseYear})`}
        </div>
      )}
      <div className="text-lg mt-5">{currentMovie.synopsis}</div>
      {recommendations.result.recommendedMovies.length && (
        <>
          <div className="mt-4 text-sm text-gray-500">
            Movie {currentIndex + 1} of{' '}
            {recommendations.result.recommendedMovies.length}
          </div>
          <button
            onClick={handleNextMovie}
            className="btn btn-primary block my-3 mx-auto text-3xl w-full mt-16"
          >
            Next Movie
          </button>
        </>
      )}
      <button
        onClick={() => router.push('/')}
        className="btn btn-secondary block my-3 mx-auto text-xl w-full"
      >
        Start Over
      </button>
    </div>
  )
}
