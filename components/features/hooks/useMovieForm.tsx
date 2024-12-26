import { MovieFormData } from '@/types/movie'
import { ChangeEvent, useCallback, useState } from 'react'

const useMovieForm = (initialState: MovieFormData) => {
  const [formData, setFormData] = useState<MovieFormData>(initialState)
  const [validationErrors, setValidationErrors] = useState({
    favouriteMovie: false,
    favouriteFilmPerson: false,
  })

  const handleTypeChange = <T extends string>(
    type: T,
    field: keyof Pick<MovieFormData, 'movieType' | 'moodType'>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: type,
    }))
  }

  const handleTextChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const { name, value } = e.target
      setFormData((prev) => ({ ...prev, [name]: value }))

      setValidationErrors((prev) => ({
        ...prev,
        [name]: false,
      }))
    },
    []
  )

  const validateForm = useCallback((data: Partial<MovieFormData>) => {
    const errors = {
      favouriteMovie: !data.favouriteMovie,
      favouriteFilmPerson: !data.favouriteFilmPerson,
    }
    setValidationErrors(errors)
    return Object.values(errors).every((error) => !error)
  }, [])

  const resetForm = useCallback(() => {
    setFormData(initialState)
  }, [initialState])

  return {
    formData,
    validationErrors,
    handleTypeChange,
    handleTextChange,
    validateForm,
    resetForm,
  }
}

export default useMovieForm
