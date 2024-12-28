import { render, screen, fireEvent } from '@testing-library/react'
import ParticipantsSetup from './ParticipantsSetup'
import { MovieContext } from '@/contexts/MovieContext'
import { createAndStoreEmbeddings } from '@/lib/utils/seed'
import { MovieContextType } from '@/types/movie'

// Mock the navigation
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock the seed utility
jest.mock('@/lib/utils/seed', () => ({
  createAndStoreEmbeddings: jest.fn(),
}))

// Mock context default values
const mockContextValue: MovieContextType = {
  participantsData: [],
  recommendations: null,
  timeAvailable: '2 hours',
  totalParticipants: 4,
  setParticipantsData: jest.fn(),
  setRecommendations: jest.fn(),
  setGroupTimeAvailable: jest.fn(),
  setTotalParticipants: jest.fn(),
}

describe('ParticipantsSetup', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all the elements correctly', () => {
    render(
      <MovieContext.Provider value={mockContextValue}>
        <ParticipantsSetup />
      </MovieContext.Provider>
    )

    // Check if main elements are rendered
    expect(screen.getByText('How many people?')).toBeInTheDocument()
    expect(screen.getByRole('slider')).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText('How much time do you have?')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
  })

  it('calls createAndStoreEmbeddings on mount', () => {
    render(
      <MovieContext.Provider value={mockContextValue}>
        <ParticipantsSetup />
      </MovieContext.Provider>
    )

    expect(createAndStoreEmbeddings).toHaveBeenCalledTimes(1)
  })

  it('updates participants when slider changes', () => {
    render(
      <MovieContext.Provider value={mockContextValue}>
        <ParticipantsSetup />
      </MovieContext.Provider>
    )

    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '6' } })

    expect(mockContextValue.setTotalParticipants).toHaveBeenCalledWith(6)
  })

  it('updates time available when input changes', () => {
    render(
      <MovieContext.Provider value={mockContextValue}>
        <ParticipantsSetup />
      </MovieContext.Provider>
    )

    const input = screen.getByPlaceholderText('How much time do you have?')
    fireEvent.change(input, { target: { value: '3 hours' } })

    expect(mockContextValue.setGroupTimeAvailable).toHaveBeenCalledWith(
      '3 hours'
    )
  })

  it('navigates to movieForm when Start button is clicked', () => {
    render(
      <MovieContext.Provider value={mockContextValue}>
        <ParticipantsSetup />
      </MovieContext.Provider>
    )

    const startButton = screen.getByRole('button', { name: 'Start' })
    fireEvent.click(startButton)

    expect(mockPush).toHaveBeenCalledWith('/movieForm')
  })
})
