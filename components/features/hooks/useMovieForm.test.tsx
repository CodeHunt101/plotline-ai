import { renderHook, act } from '@testing-library/react'
import useMovieForm from './useMovieForm'
import { MovieFormData } from '@/types/movie'

describe('useMovieForm', () => {
  const initialState: MovieFormData = {
    favouriteMovie: '',
    movieType: 'new',
    moodType: 'fun',
    favouriteFilmPerson: '',
  }

  it('should initialise with the provided initial state', () => {
    const { result } = renderHook(() => useMovieForm(initialState))

    expect(result.current.formData).toEqual(initialState)
    expect(result.current.validationErrors).toEqual({
      favouriteMovie: false,
      favouriteFilmPerson: false,
    })
  })

  describe('handleTypeChange', () => {
    it('should update movieType correctly', () => {
      const { result } = renderHook(() => useMovieForm(initialState))

      act(() => {
        result.current.handleTypeChange('classic', 'movieType')
      })

      expect(result.current.formData.movieType).toBe('classic')
    })

    it('should update moodType correctly', () => {
      const { result } = renderHook(() => useMovieForm(initialState))

      act(() => {
        result.current.handleTypeChange('scary', 'moodType')
      })

      expect(result.current.formData.moodType).toBe('scary')
    })
  })

  describe('handleTextChange', () => {
    it('should update text fields and clear validation errors', () => {
      const { result } = renderHook(() => useMovieForm(initialState))

      const mockEvent = {
        target: {
          name: 'favouriteMovie',
          value: 'The Matrix',
        },
      } as React.ChangeEvent<HTMLTextAreaElement>

      act(() => {
        result.current.handleTextChange(mockEvent)
      })

      expect(result.current.formData.favouriteMovie).toBe('The Matrix')
      expect(result.current.validationErrors.favouriteMovie).toBe(false)
    })
  })

  describe('validateForm', () => {
    it('should return true and clear errors when all required fields are filled', () => {
      const { result } = renderHook(() => useMovieForm(initialState))
      const validData: Partial<MovieFormData> = {
        favouriteMovie: 'The Matrix',
        favouriteFilmPerson: 'Keanu Reeves',
      }

      let isValid: boolean = false
      act(() => {
        isValid = result.current.validateForm(validData)
      })

      expect(isValid).toBe(true)
      expect(result.current.validationErrors).toEqual({
        favouriteMovie: false,
        favouriteFilmPerson: false,
      })
    })

    it('should return false and set errors when required fields are empty', () => {
      const { result } = renderHook(() => useMovieForm(initialState))
      const invalidData: Partial<MovieFormData> = {
        favouriteMovie: '',
        favouriteFilmPerson: '',
      }

      let isValid: boolean = false
      act(() => {
        isValid = result.current.validateForm(invalidData)
      })

      expect(isValid).toBe(false)
      expect(result.current.validationErrors).toEqual({
        favouriteMovie: true,
        favouriteFilmPerson: true,
      })
    })
  })

  describe('resetForm', () => {
    it('should reset form data to initial state', () => {
      const { result } = renderHook(() => useMovieForm(initialState))

      // First, modify the form data
      act(() => {
        result.current.handleTypeChange('classic', 'movieType')
        result.current.handleTextChange({
          target: {
            name: 'favouriteMovie',
            value: 'The Matrix',
          },
        } as React.ChangeEvent<HTMLTextAreaElement>)
      })

      // Then reset
      act(() => {
        result.current.resetForm()
      })

      expect(result.current.formData).toEqual(initialState)
    })
  })

  describe('rerender with different initial state', () => {
    it('should update reset functionality when initial state changes', () => {
      const { result, rerender } = renderHook((props) => useMovieForm(props), {
        initialProps: initialState,
      })

      const newInitialState: MovieFormData = {
        ...initialState,
        movieType: 'classic',
        moodType: 'scary',
      }

      // Rerender with new initial state
      rerender(newInitialState)

      // Reset should now use new initial state
      act(() => {
        result.current.resetForm()
      })

      expect(result.current.formData).toEqual(newInitialState)
    })
  })
})
