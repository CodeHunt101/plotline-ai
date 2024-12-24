'use client'

import { useMovieContext } from '@/contexts/MovieContext'
import { useRouter } from 'next/navigation'

export default function Recommendations() {
  const { recommendation } = useMovieContext()
  const router = useRouter()

  if (!recommendation) {
    router.push('/')
    return null
  }

  const [title, description] = recommendation.result.split(': ')

  return (
    <div className="mt-6">
      <div className="text-3xl mt-12">{title}</div>
      <div className="text-lg mt-5">{description}</div>
      <button onClick={()=>router.push('/')} className="btn btn-primary block my-3 mx-auto text-3xl w-full mt-16">
        Go Again
      </button>
    </div>
  )
}
