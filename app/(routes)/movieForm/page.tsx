'use client'

import useMovieForm from '@/components/features/hooks/useMovieForm'
import MovieFormFields from '@/components/features/MovieFormFields'
import { useMovieContext } from '@/contexts/MovieContext'
import { getMovieRecommendation } from '@/lib/utils/movie'
import { MovieFormData } from '@/types/movie'
import { useRouter } from 'next/navigation'
import { useActionState, useState } from 'react'

const INITIAL_FORM_STATE: MovieFormData = {
  favouriteMovie: '',
  favouriteFilmPerson: '',
  movieType: 'new',
  moodType: 'fun',
}

const MovieForm = () => {
  const router = useRouter()
  const {
    timeAvailable,
    participantsData,
    totalParticipants,
    setParticipantsData,
    setRecommendations,
  } = useMovieContext()

  console.log({ timeAvailable, participantsData, totalParticipants })

  const [currentParticipant, setCurrentParticipant] = useState(1)
  const {
    formData,
    validationErrors,
    handleTypeChange,
    handleTextChange,
    validateForm,
    resetForm,
  } = useMovieForm(INITIAL_FORM_STATE)

  const handleFormSubmission = async (formDataObj: FormData) => {
    const favouriteMovie = formDataObj.get('favouriteMovie')?.toString() || ''
    const favouriteFilmPerson =
      formDataObj.get('favouriteFilmPerson')?.toString() || ''

    if (!validateForm({ favouriteMovie, favouriteFilmPerson })) {
      throw new Error('Please fill out all required fields')
    }

    const currentData = { ...formData, favouriteMovie, favouriteFilmPerson }
    const updatedParticipantsData = [...participantsData, currentData]

    if (currentParticipant < totalParticipants) {
      setParticipantsData(updatedParticipantsData)
      setCurrentParticipant((prev) => prev + 1)
      resetForm()
      return null
    }

    const recommendedMovies = await getMovieRecommendation({
      timeAvailable,
      participantsData: updatedParticipantsData,
    })

    setParticipantsData(updatedParticipantsData)
    setRecommendations(recommendedMovies)
    router.push('/recommendations')
    return null
  }

  const [error, submitAction, isPending] = useActionState(
    async (_prevState: unknown, formDataObj: FormData) => {
      try {
        return await handleFormSubmission(formDataObj)
      } catch (err) {
        return err instanceof Error
          ? err.message
          : 'An unexpected error occurred'
      }
    },
    null
  )

  return (
    <>
      <h2 className="text-2xl mb-4 text-center">
        Person #{currentParticipant}
      </h2>
      <form action={submitAction} className="space-y-6">
        <MovieFormFields
          formData={formData}
          validationErrors={validationErrors}
          handleTextChange={handleTextChange}
          handleTypeChange={handleTypeChange}
        />

        <button
          disabled={isPending}
          type="submit"
          className="btn btn-primary block w-full text-3xl"
        >
          {currentParticipant === totalParticipants ? 'Get Movie' : 'Next'}
        </button>

        {error && <p className="text-red-500 text-center">{error}</p>}
      </form>
    </>
  )
}

export default MovieForm
