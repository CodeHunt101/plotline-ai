'use client'

import { useMovieContext } from '@/contexts/MovieContext'
import { extractSynopses } from '@/lib/utils/movie'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function Recommendations() {
  const { recommendations } = useMovieContext()
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [synopses, setSynopses] = useState<string[]>([])

  useEffect(() => {
    if (!recommendations) {
      router.push('/')
    }

    if (recommendations?.result) {
      setSynopses(extractSynopses(recommendations?.result))
    }
    
  }, [recommendations, router])

  if (!recommendations) {
    return null
  }

  const handleNextMovie = () => {
    // If we're at the last movie, go back to the first one
    if (currentIndex === recommendations.match.length - 1) {
      setCurrentIndex(0)
    } else {
      // Otherwise, move to the next movie
      setCurrentIndex(currentIndex + 1)
    }
  }

  const currentMovie = recommendations.match[currentIndex]

  return (
    <div className="mt-6">
      {currentMovie?.title && (
        <div className="text-3xl mt-12">
          {`${currentMovie.title} (${currentMovie.release_year})`}
        </div>
      )}
      <div className="text-lg mt-5">{synopses[currentIndex]}</div>
      {recommendations.match.length && 
      <>
        <div className="mt-4 text-sm text-gray-500">
          Movie {currentIndex + 1} of {recommendations.match.length}
        </div>
        <button
          onClick={handleNextMovie}
          className="btn btn-primary block my-3 mx-auto text-3xl w-full mt-16"
        >
          Next Movie
        </button>
      </>}
      <button
        onClick={() => router.push('/')}
        className="btn btn-secondary block my-3 mx-auto text-xl w-full"
      >
        Start Over
      </button>
    </div>
  )
}
