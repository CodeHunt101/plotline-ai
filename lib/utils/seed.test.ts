import { createAndStoreEmbeddings, normaliseEmbedding } from './seed'
import { supabase } from '../config/supabase'
import { openai } from '../config/openai'

export function mockFetch(data: unknown) {
  return jest.fn().mockImplementation(() =>
    Promise.resolve({
      ok: true,
      text: () => data,
    })
  )
}

// Mock external dependencies
jest.mock('../config/supabase')
jest.mock('../config/openai')
jest.mock('langchain/text_splitter', () => ({
  RecursiveCharacterTextSplitter: jest.fn().mockImplementation(() => ({
    createDocuments: jest
      .fn()
      .mockResolvedValue([
        { pageContent: 'chunk1' },
        { pageContent: 'chunk2' },
      ]),
  })),
}))

describe('seed.ts functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('normaliseEmbedding', () => {
    it('should correctly normalize a vector', () => {
      const input = [3, 4] // Simple 3-4-5 triangle for easy verification
      const expected = [0.6, 0.8] // 3/5 and 4/5
      const result = normaliseEmbedding(input)

      result.forEach((val, idx) => {
        expect(val).toBeCloseTo(expected[idx], 5)
      })
    })

    it('should handle zero vectors', () => {
      const input = [0, 0, 0]
      const result = normaliseEmbedding(input)
      expect(result).toEqual([0, 0, 0])
    })

    it('should maintain vector direction after normalization', () => {
      const input = [2, 4, 4]
      const result = normaliseEmbedding(input)

      // Check if ratios between components are maintained
      expect(result[1] / result[0]).toBeCloseTo(2, 5)
      expect(result[2] / result[0]).toBeCloseTo(2, 5)
    })
  })

  describe('createAndStoreEmbeddings', () => {
    beforeEach(() => {
      // Mock fetch response
      window.fetch = mockFetch(
        'movie1\nmovie2\nmovie3\nmovie4\nmovie5\nmovie6\nmovie7\nmovie8\nmovie9\nmovie10'
      )

      // Mock OpenAI response
      ;(openai.embeddings.create as jest.Mock).mockResolvedValue({
        data: [
          {
            embedding: [0.1, 0.2, 0.3],
          },
        ],
      })
    })

    it('should skip insertion if table is not empty', async () => {
      // Mock Supabase response for non-empty table
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ id: 1 }],
            error: null,
          }),
        }),
      })

      await createAndStoreEmbeddings()

      expect(window.fetch).not.toHaveBeenCalled()
      expect(openai.embeddings.create).not.toHaveBeenCalled()
    })

    it('should process and store embeddings if table is empty', async () => {
      // Mock Supabase responses
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
        insert: jest.fn().mockResolvedValue({ error: null }),
      })

      await createAndStoreEmbeddings()

      expect(window.fetch).toHaveBeenCalledWith('/constants/movies.txt')
      expect(openai.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: expect.any(String),
        dimensions: 1536,
      })
    })

    it('should handle Supabase errors during initial check', async () => {
      // Mock Supabase error response
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: null,
            error: new Error('Database error'),
          }),
        }),
      })

      await createAndStoreEmbeddings()

      expect(fetch).not.toHaveBeenCalled()
      expect(openai.embeddings.create).not.toHaveBeenCalled()
    })

    it('should handle batch insertion errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Mock successful empty table check but failed insertion
      ;(supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
        insert: jest
          .fn()
          .mockResolvedValue({ error: new Error('Insertion error') }),
      })

      await createAndStoreEmbeddings()

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error inserting batch:',
        expect.any(Error)
      )
      consoleSpy.mockRestore()
    })
  })
})
