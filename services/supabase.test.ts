import { supabase } from '../lib/config/supabase'
import { MovieRecord } from '@/types/api'
import { findNearestMatch } from './supabase'

// Mock supabase
jest.mock('../lib/config/supabase')

describe('findNearestMatch', () => {
  it('should return matching movies when matches are found', async () => {
    const mockMatches: MovieRecord[] = [
      {
        id: 1,
        content: 'Movie 1',
        similarity: 0.9,
      },
      {
        id: 2,
        content: 'Movie 2',
        similarity: 0.8,
      },
    ]

    // Mock the supabase RPC call
    ;(supabase.rpc as jest.Mock).mockResolvedValue({
      data: mockMatches,
      error: null,
    })

    const testEmbedding = [0.1, 0.2, 0.3]
    const result = await findNearestMatch(testEmbedding)

    // Verify RPC was called with correct parameters
    expect(supabase.rpc).toHaveBeenCalledWith('match_movies_4', {
      query_embedding: testEmbedding,
      match_threshold: 0.3,
      match_count: 10,
    })

    // Verify results
    expect(result).toEqual(mockMatches)
  })

  it('should return empty array when no matches are found', async () => {
    // Mock empty response
    ;(supabase.rpc as jest.Mock).mockResolvedValue({
      data: [],
      error: null,
    })

    const testEmbedding = [0.1, 0.2, 0.3]
    const result = await findNearestMatch(testEmbedding)

    expect(result).toEqual([])
  })

  it('should return empty array when data is null', async () => {
    // Mock null response
    ;(supabase.rpc as jest.Mock).mockResolvedValue({
      data: null,
      error: null,
    })

    const testEmbedding = [0.1, 0.2, 0.3]
    const result = await findNearestMatch(testEmbedding)

    expect(result).toEqual([])
  })

  it('should handle different similarity scores correctly', async () => {
    const mockMatches: MovieRecord[] = [
      { id: 1, content: 'Movie 1', similarity: 0.95 },
      { id: 2, content: 'Movie 2', similarity: 0.85 },
      { id: 3, content: 'Movie 3', similarity: 0.75 },
      { id: 4, content: 'Movie 4', similarity: 0.65 },
    ]

    ;(supabase.rpc as jest.Mock).mockResolvedValue({
      data: mockMatches,
      error: null,
    })

    const testEmbedding = [0.1, 0.2, 0.3]
    const result = await findNearestMatch(testEmbedding)

    expect(result).toEqual(mockMatches)
  })

  it('should use correct match threshold and count', async () => {
    ;(supabase.rpc as jest.Mock).mockResolvedValue({
      data: [],
      error: null,
    })

    const testEmbedding = [0.1, 0.2, 0.3]
    await findNearestMatch(testEmbedding)

    expect(supabase.rpc).toHaveBeenCalledWith('match_movies_4', {
      query_embedding: testEmbedding,
      match_threshold: 0.3,
      match_count: 10,
    })
  })
})
