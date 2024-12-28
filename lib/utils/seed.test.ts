import { createAndStoreEmbeddings, normaliseEmbedding } from './seed'
import { SUPABASE_WORKER_URL } from '../config/supabase'
import { OPENAI_WORKER_URL } from '../config/openai'
import { waitFor } from '@testing-library/react'

export function mockFetch(data: unknown) {
  return jest.fn().mockImplementation(() =>
    Promise.resolve({
      ok: true,
      text: () => Promise.resolve(data),
      json: () => Promise.resolve(data),
    })
  )
}

// Mock external dependencies
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
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
    // Reset fetch to a clean mock for each test
    global.fetch = jest.fn()
  })

  afterEach(() => {
    global.fetch = originalFetch
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
      // Mock movies.txt fetch response
      ;(global.fetch as jest.Mock).mockImplementation((url) => {
        if (url === '/constants/movies.txt') {
          return Promise.resolve({
            ok: true,
            text: () =>
              Promise.resolve(
                'movie1\nmovie2\nmovie3\nmovie4\nmovie5\nmovie6\nmovie7\nmovie8\nmovie9\nmovie10'
              ),
          })
        }
        // Mock check-empty endpoint
        if (url === `${SUPABASE_WORKER_URL}/api/check-empty`) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ isEmpty: true }),
          })
        }
        // Mock embeddings API response
        if (url === `${OPENAI_WORKER_URL}/api/embeddings`) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ embedding: [0.1, 0.2, 0.3] }),
          })
        }
        // Mock insert-movies endpoint
        if (url === `${SUPABASE_WORKER_URL}/api/insert-movies`) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ error: null }),
          })
        }
      })
    })

    it('should skip insertion if table is not empty', async () => {
      // Mock check-empty endpoint to return false
      ;(global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ isEmpty: false }),
        })
      )

      await createAndStoreEmbeddings()

      // Check that only the check-empty endpoint was called
      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(global.fetch).toHaveBeenCalledWith(
        `${SUPABASE_WORKER_URL}/api/check-empty`
      )
    })

    it('should process and store embeddings if table is empty', async () => {
      await createAndStoreEmbeddings()

      // Verify check-empty endpoint call
      expect(global.fetch).toHaveBeenCalledWith(
        `${SUPABASE_WORKER_URL}/api/check-empty`
      )

      // Verify movies.txt fetch
      waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/constants/movies.txt')
      })

      // Verify embeddings API call
      waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `${OPENAI_WORKER_URL}/api/embeddings`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              input: expect.any(String),
              dimensions: 1536,
            }),
          }
        )
      })

      // Verify insert-movies endpoint call
      waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `${SUPABASE_WORKER_URL}/api/insert-movies`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: expect.any(String),
          }
        )
      })
    })

    it('should handle check-empty endpoint errors', async () => {
      // Mock check-empty endpoint error
      ;(global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.reject(new Error('Check empty error'))
      )

      await expect(createAndStoreEmbeddings()).rejects.toThrow(
        'Check empty error'
      )

      expect(global.fetch).toHaveBeenCalledWith(
        `${SUPABASE_WORKER_URL}/api/check-empty`
      )
      expect(global.fetch).not.toHaveBeenCalledWith('/constants/movies.txt')
    })

    it('should handle batch insertion errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Mock insert-movies endpoint error
      ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
        if (url === `${SUPABASE_WORKER_URL}/api/insert-movies`) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ error: 'Insertion error' }),
          })
        }

        if (url === `${SUPABASE_WORKER_URL}/api/check-empty`) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ isEmpty: true }),
          })
        }

        if (url === '/constants/movies.txt') {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve('movie1\nmovie2'),
          })
        }

        if (url === `${OPENAI_WORKER_URL}/api/embeddings`) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ embedding: [0.1, 0.2, 0.3] }),
          })
        }
      })

      await createAndStoreEmbeddings()

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error inserting batch:',
        'Insertion error'
      )
      consoleSpy.mockRestore()
    })

    it('should handle embeddings API errors', async () => {
      // Mock successful responses for initial calls
      ;(global.fetch as jest.Mock).mockImplementation((url) => {
        if (url === `${SUPABASE_WORKER_URL}/api/check-empty`) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ isEmpty: true }),
          })
        }
        if (url === '/constants/movies.txt') {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve('movie1\nmovie2'),
          })
        }
        // Mock failed embeddings API call
        if (url === `${OPENAI_WORKER_URL}/api/embeddings`) {
          return Promise.resolve({
            ok: false,
            json: () => Promise.resolve({ error: 'API Error' }),
          })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      })

      await expect(createAndStoreEmbeddings()).rejects.toThrow(
        'Failed to get embeddings'
      )

      // Verify API calls were made in correct order
      expect(global.fetch).toHaveBeenCalledWith(
        `${SUPABASE_WORKER_URL}/api/check-empty`
      )
      expect(global.fetch).toHaveBeenCalledWith('/constants/movies.txt')
      expect(global.fetch).toHaveBeenCalledWith(
        `${OPENAI_WORKER_URL}/api/embeddings`,
        expect.any(Object)
      )
    })
  })
})
