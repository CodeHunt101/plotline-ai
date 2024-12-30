import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { MovieContext, MovieProvider } from '@/contexts/MovieContext'
import MovieForm from './page'
import { ParticipantData } from '@/types/movie'
import { getMovieRecommendations } from '@/services/movies'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/services/movies', () => ({
  getMovieRecommendations: jest.fn(),
}))

// Mock useActionState hook to return the expected tuple
const mockSubmitAction = jest.fn()
const mockIsPending = false
const mockError = null

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useActionState: () => [mockError, mockSubmitAction, mockIsPending],
  useState: jest.requireActual('react').useState,
}))

describe('MovieForm', () => {
  const mockRouter = {
    push: jest.fn(),
  }

  const mockRecommendation = {
    match: [],
    result: {
      recommendedMovies: [
        {
          name: 'Test Movie',
          releaseYear: '2024',
          synopsis: 'A test movie',
        },
      ],
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(getMovieRecommendations as jest.Mock).mockResolvedValue(mockRecommendation)
  })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const renderMovieForm = (participants = 1) => {
    return render(
      <MovieProvider>
        <MovieForm />
      </MovieProvider>
    )
  }

  it('renders the form with initial state', () => {
    renderMovieForm()

    expect(screen.getByText('Person #1')).toBeInTheDocument()
    expect(screen.getByRole('button')).toHaveTextContent('Get Movie')
  })

  it('displays validation errors when submitting empty form', async () => {
    renderMovieForm()

    // Create a mock FormData object
    const mockFormData = new FormData()
    mockFormData.append('favouriteMovie', '')
    mockFormData.append('favouriteFilmPerson', '')

    // Trigger the submit action directly
    await mockSubmitAction(mockFormData)

    waitFor(() => {
      expect(
        screen.getByText('Please fill out all required fields')
      ).toBeInTheDocument()
    })
  })

  it('handles successful form submission for single participant', async () => {
    renderMovieForm()

    // Fill out the form
    fireEvent.change(screen.getByLabelText(/favourite movie/i), {
      target: { name: 'favouriteMovie', value: 'The Matrix' },
    })

    fireEvent.change(screen.getByLabelText(/famous film person/i), {
      target: { name: 'favouriteFilmPerson', value: 'Keanu Reeves' },
    })

    // Create a mock FormData object with the form values
    const mockFormData = new FormData()
    mockFormData.append('favouriteMovie', 'The Matrix')
    mockFormData.append('favouriteFilmPerson', 'Keanu Reeves')

    // Trigger the submit action directly
    await mockSubmitAction(mockFormData)

    waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/recommendations')
      expect(getMovieRecommendations).toHaveBeenCalled()
    })
  })

  it('handles multi-participant form submission correctly', async () => {
    // Set up MovieContext with 2 participants
    const participantsData: ParticipantData[] = []
    const recommendations = null
    const timeAvailable = ''
    const totalParticipants = 2
    render(
      <MovieProvider>
        <MovieContext.Provider
          value={{
            participantsData,
            recommendations,
            timeAvailable,
            totalParticipants,
            setParticipantsData: jest.fn(),
            setRecommendations: jest.fn(),
            setGroupTimeAvailable: jest.fn(),
            setTotalParticipants: jest.fn(),
          }}
        >
          <MovieForm />
        </MovieContext.Provider>
      </MovieProvider>
    )

    // Submit first participant's data
    const movieInput1 = screen.getByLabelText(
      "What's your favourite movie and why?"
    )
    const personInput1 = screen.getByLabelText(/famous film person/i)

    fireEvent.change(movieInput1, {
      target: { value: 'Interstellar' },
    })
    fireEvent.change(personInput1, {
      target: { value: 'Matt Damon' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    // Verify second participant's form is shown
    waitFor(() => {
      expect(screen.getByText('Person #2')).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: 'Get Movie' })
      ).toBeInTheDocument()

      // Submit second participant's data
      const movieInput2 = screen.getByLabelText(
        "What's your favourite movie and why?"
      )
      const personInput2 = screen.getByLabelText(/famous film person/i)

      fireEvent.change(movieInput2, {
        target: { value: 'The Dark Knight' },
      })
      fireEvent.change(personInput2, {
        target: { value: 'Heath Ledger' },
      })

      fireEvent.click(screen.getByRole('button', { name: 'Get Movie' }))
    })

    waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/recommendations')
      expect(getMovieRecommendations).toHaveBeenCalled()
    })
  })

  it('submits the form and navigates to recommendations page on success', async () => {
    renderMovieForm()

    // Fill out the form
    fireEvent.change(
      screen.getByLabelText("What's your favourite movie and why?"),
      {
        target: { value: 'Inception' },
      }
    )
    fireEvent.change(
      screen.getByLabelText(
        'Which famous film person would you love to be stranded on an island with and why?'
      ),
      {
        target: { value: 'Christopher Nolan' },
      }
    )

    fireEvent.click(screen.getByRole('button'))

    waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/recommendations')
    })
  })

  it('handles movie type and mood type selection', () => {
    renderMovieForm()

    const classicRadio = screen.getByText('Classic')
    fireEvent.click(classicRadio)
    waitFor(() => {
      expect(classicRadio).toBeChecked()
    })

    const seriousRadio = screen.getByText('Serious')
    fireEvent.click(seriousRadio)
    waitFor(() => {
      expect(seriousRadio).toBeChecked()
    })
  })

  it('resets form after submission for multi-participant scenario', async () => {
    renderMovieForm(2)

    // Fill and submit first participant
    fireEvent.change(screen.getByLabelText(/favourite movie/i), {
      target: { name: 'favouriteMovie', value: 'The Matrix' },
    })

    fireEvent.change(screen.getByLabelText(/famous film person/i), {
      target: { name: 'favouriteFilmPerson', value: 'Keanu Reeves' },
    })

    const mockFormData = new FormData()
    mockFormData.append('favouriteMovie', 'The Matrix')
    mockFormData.append('favouriteFilmPerson', 'Keanu Reeves')
    await mockSubmitAction(mockFormData)

    waitFor(() => {
      const movieInput = screen.getByLabelText(
        /favourite movie/i
      ) as HTMLTextAreaElement
      const personInput = screen.getByLabelText(
        /famous film person/i
      ) as HTMLTextAreaElement
      expect(movieInput.value).toBe('')
      expect(personInput.value).toBe('')
    })
  })

  it('handles API errors gracefully', async () => {
    ;(getMovieRecommendations as jest.Mock).mockRejectedValue(
      new Error('API Error')
    )

    renderMovieForm()

    fireEvent.change(screen.getByLabelText(/favourite movie/i), {
      target: { name: 'favouriteMovie', value: 'The Matrix' },
    })

    fireEvent.change(screen.getByLabelText(/famous film person/i), {
      target: { name: 'favouriteFilmPerson', value: 'Keanu Reeves' },
    })

    const mockFormData = new FormData()
    mockFormData.append('favouriteMovie', 'The Matrix')
    mockFormData.append('favouriteFilmPerson', 'Keanu Reeves')
    await mockSubmitAction(mockFormData)

    waitFor(() => {
      expect(
        screen.getByText(/An unexpected error occurred/i)
      ).toBeInTheDocument()
    })
  })
})
