import { SUPABASE_WORKER_URL } from '../lib/config/supabase'
import { MovieRecord } from '@/types/api'
import { findNearestMatch } from './supabase'

describe('findNearestMatch', () => {
  const originalFetch = global.fetch
  const mockEmbedding = [0.1, 0.2, 0.3]
  const mockMatches: MovieRecord[] = [
    {
      id: 1,
      content: 'Test Movie 1',
      similarity: 0.95,
    },
    {
      id: 2,
      content: 'Test Movie 2',
      similarity: 0.85,
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
    jest.spyOn(console, 'log').mockImplementation()
  })

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  it('should return matches when found', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ matches: mockMatches }),
    })

    const result = await findNearestMatch(mockEmbedding)

    expect(global.fetch).toHaveBeenCalledWith(
      `${SUPABASE_WORKER_URL}/api/match-movies`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ embedding: mockEmbedding }),
      }
    )
    expect(result).toEqual(mockMatches)
    expect(console.log).toHaveBeenCalledWith(
      'Match scores:',
      mockMatches.map((d) => d.similarity)
    )
  })

  it('should return empty array when no matches found', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ matches: [] }),
    })

    const result = await findNearestMatch(mockEmbedding)

    expect(result).toEqual([])
    expect(console.log).toHaveBeenCalledWith('No matches found')
  })

  it('should return empty array when matches is null', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ matches: null }),
    })

    const result = await findNearestMatch(mockEmbedding)

    expect(result).toEqual([])
    expect(console.log).toHaveBeenCalledWith('No matches found')
  })

  it('should return empty array when error occurs', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ error: 'Database error' }),
    })

    const result = await findNearestMatch(mockEmbedding)

    expect(result).toEqual([])
    expect(console.log).toHaveBeenCalledWith('No matches found')
  })

  it('should handle network errors', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Network error')
    )

    await expect(findNearestMatch(mockEmbedding)).rejects.toThrow(
      'Network error'
    )
  })

  it('should handle invalid JSON response', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.reject(new Error('Invalid JSON')),
    })

    await expect(findNearestMatch(mockEmbedding)).rejects.toThrow(
      'Invalid JSON'
    )
  })
})
