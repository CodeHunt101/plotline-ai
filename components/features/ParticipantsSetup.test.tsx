import { render, fireEvent, waitFor } from '@testing-library/react'
import { MovieProvider, useMovieContext } from '@/contexts/MovieContext'
import ParticipantsSetup from './ParticipantsSetup'

const mockRouter = {
  push: jest.fn(),
}

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
}))

describe('ParticipantsSetup', () => {
  it('should update total participants when the range input is changed', () => {
    const { getByRole } = render(
      <MovieProvider>
        <ParticipantsSetup />
      </MovieProvider>
    )

    const rangeInput = getByRole('slider')
    fireEvent.change(rangeInput, { target: { value: 5 } })

    waitFor(() => {
      expect(useMovieContext().totalParticipants).toBe(5)
    })
  })

  it('should update time available when the text input is changed', () => {
    const { getByPlaceholderText } = render(
      <MovieProvider>
        <ParticipantsSetup />
      </MovieProvider>
    )

    const timeInput = getByPlaceholderText('How much time do you have?')
    fireEvent.change(timeInput, { target: { value: '2 hours' } })

    waitFor(() => {
      expect(useMovieContext().timeAvailable).toBe('2 hours')
    })
  })

  it('should call the router push function when the start button is clicked', () => {
    jest.clearAllMocks()

    const { getByText } = render(
      <MovieProvider>
        <ParticipantsSetup />
      </MovieProvider>
    )

    const startButton = getByText('Start')
    fireEvent.click(startButton)

    expect(mockRouter.push).toHaveBeenCalledTimes(1)
    expect(mockRouter.push).toHaveBeenCalledWith('/movieForm')
  })

  it('should render the range input with the correct min and max values', () => {
    const { getByRole } = render(
      <MovieProvider>
        <ParticipantsSetup />
      </MovieProvider>
    )

    const rangeInput = getByRole('slider')
    expect(rangeInput.getAttribute('min')).toBe('1')
    expect(rangeInput.getAttribute('max')).toBe('10')
  })

  it('should render the range input with the correct step value', () => {
    const { getByRole } = render(
      <MovieProvider>
        <ParticipantsSetup />
      </MovieProvider>
    )

    const rangeInput = getByRole('slider')
    expect(rangeInput.getAttribute('step')).toBe('1')
  })

  it('should render the correct number of participant labels', () => {
    const { getAllByText } = render(
      <MovieProvider>
        <ParticipantsSetup />
      </MovieProvider>
    )

    const participantLabels = getAllByText(/^[0-9]+$/)
    expect(participantLabels.length).toBe(10)
  })
})
