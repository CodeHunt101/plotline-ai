'use client'

import { useMovieContext } from '@/contexts/MovieContext'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { getMoviePoster } from '@/services/tmdb'

export default function Recommendations() {
  const { recommendations, setGroupTimeAvailable } = useMovieContext()
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [posterUrls, setPosterUrls] = useState<{ [key: string]: string }>({})
  const [isLoadingPoster, setIsLoadingPoster] = useState(true)

  useEffect(() => {
    if (!recommendations) {
      return router.push('/')
    }
  }, [recommendations, router])

  useEffect(() => {
    const fetchPoster = async () => {
      const currentMovie =
        recommendations?.result.recommendedMovies[currentIndex]
      if (!currentMovie?.name) return

      // Check if we already have the poster URL cached
      if (posterUrls[currentMovie.name]) {
        setIsLoadingPoster(false)
        return
      }

      setIsLoadingPoster(true)
      try {
        const url = await getMoviePoster(currentMovie.name)
        setPosterUrls((prev) => ({
          ...prev,
          [currentMovie.name]: url || '',
        }))
      } catch (error) {
        console.error('Error fetching poster:', error)
        setPosterUrls((prev) => ({
          ...prev,
          [currentMovie.name]: '',
        }))
      } finally {
        setIsLoadingPoster(false)
      }
    }

    fetchPoster()
  }, [currentIndex, recommendations, posterUrls])

  if (!recommendations) {
    return null
  }

  const handleNextMovie = () => {
    if (currentIndex === recommendations.result.recommendedMovies.length - 1) {
      setCurrentIndex(0)
    } else {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const currentMovie = recommendations.result.recommendedMovies[currentIndex]
  const currentPosterUrl = currentMovie?.name
    ? posterUrls[currentMovie.name]
    : ''

  return (
    <>
      {recommendations.result.recommendedMovies.length ? (
        <div className="mt-6">
          {currentMovie?.name && (
            <>
              <div className="text-3xl text-center">
                {`${currentMovie.name} (${currentMovie?.releaseYear})`}
              </div>
              {isLoadingPoster ? (
                <div
                  data-testid="poster-loading"
                  className="w-64 h-96 bg-gray-700 animate-pulse rounded-lg mx-auto mt-6"
                />
              ) : currentPosterUrl ? (
                <div className="relative w-[325px] h-[480px] mx-auto mt-6">
                  <Image
                    src={currentPosterUrl}
                    alt={currentMovie.name}
                    className="rounded-3xl object-cover"
                    priority
                    fill
                    sizes="325px"
                  />
                </div>
              ) : null}
            </>
          )}
          <div className="text-lg mt-5">{currentMovie?.synopsis}</div>

          <div className="mt-4 text-sm text-gray-500">
            Movie {currentIndex + 1} of{' '}
            {recommendations.result.recommendedMovies.length}
          </div>
          <button
            onClick={handleNextMovie}
            className="btn btn-primary block mb-3 mx-auto text-3xl w-full mt-6"
          >
            Next Movie
          </button>
        </div>
      ) : (
        <div>No recommendations found</div>
      )}
      <button
        onClick={() => {
          setGroupTimeAvailable('')
          router.push('/')
        }}
        className="btn btn-secondary block my-3 mx-auto text-xl w-full"
      >
        Start Over
      </button>
    </>
  )
}
