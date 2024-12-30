import { matchMoviesByEmbedding } from '@/services/supabase'
import { getChatCompletion } from '@/services/openai'
import { ParticipantsMovieData, MovieRecord } from '@/types/api'
import { getMovieRecommendations } from './movies'
import { createEmbedding } from '@/services/embeddings'

// Mock all dependencies
jest.mock('@/services/embeddings', () => ({
  createEmbedding: jest.fn(),
}))
jest.mock('@/services/openai', () => ({
  getChatCompletion: jest.fn(),
}))
jest.mock('@/services/supabase', () => ({
  matchMoviesByEmbedding: jest.fn(),
}))

describe('getMovieRecommendations', () => {
  const mockMovieData: ParticipantsMovieData = {
    participantsData: [
      {
        favouriteMovie: 'Inception',
        movieType: 'new',
        moodType: 'inspiring',
        favouriteFilmPerson: 'Christopher Nolan',
      },
      {
        favouriteMovie: 'The Lion King',
        movieType: 'classic',
        moodType: 'fun',
        favouriteFilmPerson: 'Morgan Freeman',
      },
    ],
    timeAvailable: '3 hours',
  }

  const mockEmbedding = [0.1, 0.2, 0.3]
  const mockMatches: MovieRecord[] = [
    {
      id: 1,
      content: 'Movie 1: Inception (2010) - A mind-bending thriller. IMDB: 8.8',
      similarity: 0.9,
    },
    {
      id: 2,
      content: 'Movie 2: The Dark Knight (2008) - A superhero epic. IMDB: 9.0',
      similarity: 0.8,
    },
  ]

  const mockRecommendation = {
    recommendedMovies: [
      {
        name: 'Inception',
        releaseYear: '2010',
        synopsis: 'A mind-bending thriller. IMDB: 8.8',
      },
    ],
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should successfully process movie recommendations', async () => {
    ;(createEmbedding as jest.Mock).mockResolvedValue(mockEmbedding)
    ;(matchMoviesByEmbedding as jest.Mock).mockResolvedValue(mockMatches)
    ;(getChatCompletion as jest.Mock).mockResolvedValue(
      JSON.stringify(mockRecommendation)
    )

    const result = await getMovieRecommendations(mockMovieData)

    const expectedEmbeddingInput =
      'Participant 1:\n' +
      'Favorite movie: Inception\n' +
      'I want to see: new movies\n' +
      'Mood for: inspiring movies\n' +
      'Favorite film person to be stranded on an island with: Christopher Nolan\n' +
      '\n' +
      'Participant 2:\n' +
      'Favorite movie: The Lion King\n' +
      'I want to see: classic movies\n' +
      'Mood for: fun movies\n' +
      'Favorite film person to be stranded on an island with: Morgan Freeman\n' +
      '\n' +
      'Time available for all participants: 3 hours'

    // normalise both strings to handle hidden spaces or line ending inconsistencies
    const normaliseString = (str: string) => str.replace(/\s+/g, ' ').trim()

    expect(
      normaliseString((createEmbedding as jest.Mock).mock.calls[0][0])
    ).toBe(normaliseString(expectedEmbeddingInput))
    expect(matchMoviesByEmbedding).toHaveBeenCalledWith(mockEmbedding)
    expect(result).toEqual({
      match: mockMatches,
      result: mockRecommendation,
    })
  })

  it('should return empty arrays when no matches are found', async () => {
    ;(createEmbedding as jest.Mock).mockResolvedValue(mockEmbedding)
    ;(matchMoviesByEmbedding as jest.Mock).mockResolvedValue([])

    const result = await getMovieRecommendations(mockMovieData)

    expect(result).toEqual({
      match: [],
      result: { recommendedMovies: [] },
    })
    expect(getChatCompletion).not.toHaveBeenCalled()
  })

  it('should handle error from createEmbedding', async () => {
    const error = new Error('Embedding creation failed')
    ;(createEmbedding as jest.Mock).mockRejectedValue(error)

    await expect(getMovieRecommendations(mockMovieData)).rejects.toThrow(
      'Embedding creation failed'
    )
  })

  it('should handle error from matchMoviesByEmbedding', async () => {
    ;(createEmbedding as jest.Mock).mockResolvedValue(mockEmbedding)
    ;(matchMoviesByEmbedding as jest.Mock).mockRejectedValue(
      new Error('Database search failed')
    )

    await expect(getMovieRecommendations(mockMovieData)).rejects.toThrow(
      'Database search failed'
    )
  })

  it('should handle error from getChatCompletion', async () => {
    ;(createEmbedding as jest.Mock).mockResolvedValue(mockEmbedding)
    ;(matchMoviesByEmbedding as jest.Mock).mockResolvedValue(mockMatches)
    ;(getChatCompletion as jest.Mock).mockRejectedValue(
      new Error('Chat completion failed')
    )

    await expect(getMovieRecommendations(mockMovieData)).rejects.toThrow(
      'Chat completion failed'
    )
  })
})
