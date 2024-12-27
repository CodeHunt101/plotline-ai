import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { useMovieContext } from '@/contexts/MovieContext'
import { getMoviePoster } from '@/services/tmdb'
import Recommendations from './page'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  },
}))

// Mock the movie poster service
jest.mock('@/services/tmdb', () => ({
  getMoviePoster: jest.fn(),
}))

jest.mock('@/contexts/MovieContext', () => ({
  useMovieContext: jest.fn(),
  MovieProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))

describe('Recommendations Component', () => {
  const mockPush = jest.fn()
  const mockSetGroupTimeAvailable = jest.fn()

  const mockRecommendations = {
    match: [],
    result: {
      recommendedMovies: [
        {
          name: 'Test Movie 1',
          releaseYear: '2023',
          synopsis: 'Test synopsis 1',
        },
        {
          name: 'Test Movie 2',
          releaseYear: '2024',
          synopsis: 'Test synopsis 2',
        },
      ],
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
    ;(useMovieContext as jest.Mock).mockReturnValue({
      recommendations: mockRecommendations,
      setGroupTimeAvailable: mockSetGroupTimeAvailable,
    })
    ;(getMoviePoster as jest.Mock).mockResolvedValue(
      'http://example.com/poster.jpg'
    )
  })

  it('redirects to home if no recommendations', () => {
    ;(useMovieContext as jest.Mock).mockReturnValue({
      recommendations: null,
      setGroupTimeAvailable: mockSetGroupTimeAvailable,
    })

    render(<Recommendations />)
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('displays movie information correctly', async () => {
    render(<Recommendations />)

    // Check if the first movie is displayed
    waitFor(() => {
      expect(screen.getByText('Test Movie 1 (2023)')).toBeInTheDocument()
      expect(screen.getByText('Test synopsis 1')).toBeInTheDocument()
      expect(screen.getByText('Movie 1 of 2')).toBeInTheDocument()
    })
  })

  it('shows loading state while fetching poster', async () => {
    ;(getMoviePoster as jest.Mock).mockImplementation(
      () => new Promise(() => {})
    )

    render(<Recommendations />)

    expect(screen.getByTestId('poster-loading')).toBeInTheDocument()
  })

  it('handles next movie button click', async () => {
    render(<Recommendations />)

    const nextButton = screen.getByText('Next Movie')
    fireEvent.click(nextButton)

    // Check if the second movie is displayed
    waitFor(() => {
      expect(screen.getByText('Test Movie 2 (2024)')).toBeInTheDocument()
      expect(screen.getByText('Test synopsis 2')).toBeInTheDocument()
      expect(screen.getByText('Movie 2 of 2')).toBeInTheDocument()
    })
  })

  it('cycles back to first movie after last movie', async () => {
    render(<Recommendations />)

    // Click through all movies and back to first
    const nextButton = screen.getByText('Next Movie')
    fireEvent.click(nextButton) // Goes to second movie
    fireEvent.click(nextButton) // Should cycle back to first movie

    waitFor(() => {
      expect(screen.getByText('Test Movie 1 (2023)')).toBeInTheDocument()
    })
  })

  it('handles poster fetch error gracefully', async () => {
    ;(getMoviePoster as jest.Mock).mockRejectedValue(
      new Error('Failed to fetch')
    )

    render(<Recommendations />)

    // Wait for the loading state to finish
    waitFor(() => {
      expect(screen.queryByTestId('poster-loading')).not.toBeInTheDocument()
    })

    // Should still show movie information even if poster fails
    expect(screen.getByText('Test Movie 1 (2023)')).toBeInTheDocument()
  })

  it('handles start over button click', () => {
    render(<Recommendations />)

    const startOverButton = screen.getByText('Start Over')
    fireEvent.click(startOverButton)

    waitFor(() => {
      expect(mockSetGroupTimeAvailable).toHaveBeenCalledWith('')
      expect(mockPush).toHaveBeenCalledWith('/')
    })
  })

  it('displays no recommendations message when recommendations array is empty', () => {
    ;(useMovieContext as jest.Mock).mockReturnValue({
      recommendations: {
        match: [],
        result: {
          recommendedMovies: [],
        },
      },
      setGroupTimeAvailable: mockSetGroupTimeAvailable,
    })

    render(<Recommendations />)
    expect(screen.getByText('No recommendations found')).toBeInTheDocument()
  })

  it('caches poster URLs correctly', async () => {
    render(<Recommendations />)

    // Wait for initial poster fetch
    waitFor(() => {
      expect(getMoviePoster).toHaveBeenCalledTimes(1)
    })

    // Click to next movie
    fireEvent.click(screen.getByText('Next Movie'))

    // Should fetch second movie's poster
    waitFor(() => {
      expect(getMoviePoster).toHaveBeenCalledTimes(2)
    })

    // Click back to first movie
    fireEvent.click(screen.getByText('Next Movie'))

    // Should not fetch first movie's poster again as it should be cached
    waitFor(() => {
      expect(getMoviePoster).toHaveBeenCalledTimes(2)
    })
  })
})
