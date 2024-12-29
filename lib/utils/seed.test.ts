import { createAndStoreEmbeddings } from './seed'
import { SUPABASE_WORKER_URL } from '../config/supabase'
import { OPENAI_WORKER_URL } from '../config/openai'
import { waitFor } from '@testing-library/react'

// Mock fs promises
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    access: jest.fn().mockResolvedValue(undefined) // Add mock for access
  }
}))

// Get the mock after it's been initialized
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockFs = jest.mocked(require('fs').promises)

// Mock path
jest.mock('path', () => ({
  join: jest.fn().mockImplementation((...args) => args.join('/')),
}))

// Mock RecursiveCharacterTextSplitter
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
  const originalConsoleError = console.error

  beforeEach(() => {
    jest.clearAllMocks()
    global.fetch = jest.fn()
    console.error = jest.fn() // Mock console.error
    
    // Mock successful file access by default
    mockFs.access.mockResolvedValue(undefined)
    
    // Mock file read response
    mockFs.readFile.mockResolvedValue(
      'movie1\nmovie2\nmovie3\nmovie4\nmovie5\nmovie6\nmovie7\nmovie8\nmovie9\nmovie10'
    )
  })

  afterEach(() => {
    global.fetch = originalFetch
    console.error = originalConsoleError
  })

  describe('createAndStoreEmbeddings', () => {
    beforeEach(() => {
      // Mock API responses
      (global.fetch as jest.Mock).mockImplementation((url) => {
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
            json: () => Promise.resolve({ success: true }),
          })
        }
      })
    })

    it('should skip insertion if table is not empty', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ isEmpty: false }),
        })
      )

      const result = await createAndStoreEmbeddings()
      
      expect(result).toEqual({
        success: true,
        message: 'Table already populated'
      })
      expect(global.fetch).toHaveBeenCalledTimes(1)
      expect(global.fetch).toHaveBeenCalledWith(
        `${SUPABASE_WORKER_URL}/api/check-empty`
      )
      expect(mockFs.readFile).not.toHaveBeenCalled()
    })

    it('should process and store embeddings if table is empty', async () => {
      const result = await createAndStoreEmbeddings()

      expect(result).toEqual({
        success: true,
        message: 'Embeddings created and stored successfully'
      })

      // Verify check-empty endpoint call
      expect(global.fetch).toHaveBeenCalledWith(
        `${SUPABASE_WORKER_URL}/api/check-empty`
      )

      // Verify file access and read
      expect(mockFs.access).toHaveBeenCalled()
      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('public/constants/movies.txt'),
        'utf-8'
      )

      // Verify embeddings API calls
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `${OPENAI_WORKER_URL}/api/embeddings`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: expect.stringContaining('chunk1'),
          }
        )
      })

      // Verify insert-movies endpoint calls
      await waitFor(() => {
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

    it('should handle file not found error', async () => {
      mockFs.access.mockRejectedValue(new Error('File not found'))
      
      await expect(createAndStoreEmbeddings()).rejects.toThrow(
        'File not found at path'
      )
      
      expect(console.error).toHaveBeenCalledWith(
        'Error in splitDocument:',
        expect.any(Error)
      )
    })

    it('should handle check-empty endpoint errors', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() =>
        Promise.resolve({
          ok: false,
          status: 500
        })
      )

      await expect(createAndStoreEmbeddings()).rejects.toThrow(
        'Failed to check if table is empty: 500'
      )

      expect(console.error).toHaveBeenCalledWith(
        'Error in createAndStoreEmbeddings:',
        expect.any(Error)
      )
    })

    it('should handle embeddings API errors', async () => {
      (global.fetch as jest.Mock).mockImplementation((url) => {
        if (url === `${SUPABASE_WORKER_URL}/api/check-empty`) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ isEmpty: true }),
          })
        }
        if (url === `${OPENAI_WORKER_URL}/api/embeddings`) {
          return Promise.resolve({
            ok: false,
            status: 500
          })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      })

      await expect(createAndStoreEmbeddings()).rejects.toThrow(
        'Failed to get embeddings: 500'
      )

      expect(console.error).toHaveBeenCalledWith(
        'Error in createAndStoreEmbeddings:',
        expect.any(Error)
      )
    })

    it('should handle batch insertion errors', async () => {
      (global.fetch as jest.Mock).mockImplementation((url) => {
        if (url === `${SUPABASE_WORKER_URL}/api/insert-movies`) {
          return Promise.resolve({
            ok: false,
            status: 500
          })
        }
        if (url === `${SUPABASE_WORKER_URL}/api/check-empty`) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ isEmpty: true }),
          })
        }
        if (url === `${OPENAI_WORKER_URL}/api/embeddings`) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ embedding: [0.1, 0.2, 0.3] }),
          })
        }
      })

      await expect(createAndStoreEmbeddings()).rejects.toThrow(
        'Failed to insert batch: 500'
      )

      expect(console.error).toHaveBeenCalledWith(
        'Error in createAndStoreEmbeddings:',
        expect.any(Error)
      )
    })
  })
})