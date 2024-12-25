'use client'

import { useMovieContext } from '@/contexts/MovieContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Recommendations() {
  const { recommendation } = useMovieContext()
  const router = useRouter()

  useEffect(() => {
    if (!recommendation) {
      router.push('/')
    }
  }, [recommendation, router])

  if (!recommendation) {
    return null
  }

  return (
    <div className="mt-6">
      {recommendation.match.title && (
        <div className="text-3xl mt-12">{`${recommendation.match.title} (${recommendation.match.release_year})`}</div>
      )}
      <div className="text-lg mt-5">{recommendation.result}</div>
      <button
        onClick={() => router.push('/')}
        className="btn btn-primary block my-3 mx-auto text-3xl w-full mt-16"
      >
        Go Again
      </button>
    </div>
  )
}
