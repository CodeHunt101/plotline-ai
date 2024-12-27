import { render, fireEvent, waitFor } from '@testing-library/react'
import { MovieProvider, useMovieContext } from './MovieContext'
import { MovieRecommendation } from '@/types/api'

describe('MovieContext', () => {
  it('should throw an error if useMovieContext is used outside of a MovieProvider', () => {
    expect(() => render(<TestComponent />)).toThrow(
      'useMovie must be used within a MovieProvider'
    )
  })

  it('should update participantsData when setParticipantsData is called', () => {
    const { getByText } = render(
      <MovieProvider>
        <TestComponent />
      </MovieProvider>
    )

    const setParticipantsDataButton = getByText('Set Participants Data')

    fireEvent.click(setParticipantsDataButton)

    const newParticipantsData = [
      {
        favouriteMovie: 'Movie 1',
        movieType: 'new',
        moodType: 'fun',
        favouriteFilmPerson: 'Actor 1',
      },
      {
        favouriteMovie: 'Movie 2',
        movieType: 'classic',
        moodType: 'serious',
        favouriteFilmPerson: 'Actor 2',
      },
    ]

    waitFor(() => {
      expect(useMovieContext().participantsData).toEqual(newParticipantsData)
    })
  })

  it('should update recommendations when setRecommendations is called', () => {
    const { getByText } = render(
      <MovieProvider>
        <TestComponent />
      </MovieProvider>
    )

    const setRecommendationsButton = getByText('Set Recommendations')
    fireEvent.click(setRecommendationsButton)

    const newRecommendations: MovieRecommendation = {
      match: [{ id: 1, content: 'Movie 1', similarity: 0.8 }],
      result: {
        recommendedMovies: [
          { name: 'Movie 1', releaseYear: '2020', synopsis: 'Synopsis 1' },
          { name: 'Movie 2', releaseYear: '2021', synopsis: 'Synopsis 2' },
        ],
      },
    }
    waitFor(() => {
      expect(useMovieContext().recommendations).toEqual(newRecommendations)
    })
  })

  it('should update timeAvailable when setGroupTimeAvailable is called', () => {
    const { getByText } = render(
      <MovieProvider>
        <TestComponent />
      </MovieProvider>
    )

    const setGroupTimeAvailableButton = getByText('Set Group Time Available')
    fireEvent.click(setGroupTimeAvailableButton)

    const newTimeAvailable = '2024-01-01 12:00:00'
    waitFor(() => {
      expect(useMovieContext().timeAvailable).toEqual(newTimeAvailable)
    })
  })

  it('should update totalParticipants when setTotalParticipants is called', () => {
    const { getByText } = render(
      <MovieProvider>
        <TestComponent />
      </MovieProvider>
    )

    const setTotalParticipantsButton = getByText('Set Total Participants')
    fireEvent.click(setTotalParticipantsButton)

    const newTotalParticipants = 5
    waitFor(() => {
      expect(useMovieContext().totalParticipants).toEqual(newTotalParticipants)
    })
  })
})

const TestComponent = () => {
  const {
    participantsData,
    recommendations,
    timeAvailable,
    totalParticipants,
    setParticipantsData,
    setRecommendations,
    setGroupTimeAvailable,
    setTotalParticipants,
  } = useMovieContext()

  return (
    <div>
      <p>Participants Data: {JSON.stringify(participantsData)}</p>
      <p>Recommendations: {JSON.stringify(recommendations)}</p>
      <p>Time Available: {timeAvailable}</p>
      <p>Total Participants: {totalParticipants}</p>
      <button
        onClick={() =>
          setParticipantsData([
            {
              favouriteMovie: 'Movie 1',
              movieType: 'new',
              moodType: 'fun',
              favouriteFilmPerson: 'Actor 1',
            },
            {
              favouriteMovie: 'Movie 2',
              movieType: 'classic',
              moodType: 'serious',
              favouriteFilmPerson: 'Actor 2',
            },
          ])
        }
      >
        Set Participants Data
      </button>
      <button
        onClick={() =>
          setRecommendations({
            match: [{ id: 1, content: 'Movie 1', similarity: 0.8 }],
            result: {
              recommendedMovies: [
                {
                  name: 'Movie 1',
                  releaseYear: '2020',
                  synopsis: 'Synopsis 1',
                },
                {
                  name: 'Movie 2',
                  releaseYear: '2021',
                  synopsis: 'Synopsis 2',
                },
              ],
            },
          })
        }
      >
        Set Recommendations
      </button>
      <button onClick={() => setGroupTimeAvailable('2024-01-01 12:00:00')}>
        Set Group Time Available
      </button>
      <button onClick={() => setTotalParticipants(5)}>
        Set Total Participants
      </button>
    </div>
  )
}
