import { createEmbedding, normaliseEmbeddingVector, initialiseEmbeddingsStorage } from './embeddings'
import { OPENAI_WORKER_URL } from '@/config/openai'

// Mock fetch globally
global.fetch = jest.fn()

describe('createEmbedding', () => {
  beforeEach(() => {
    // Clear mock calls between tests
    jest.clearAllMocks()
  })

  it('should create and normalise an embedding', async () => {
    const mockEmbedding = [1, 2, 3]
    const mockResponse = { embedding: mockEmbedding }
    
    // Mock the fetch response
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve(mockResponse)
    })

    const result = await createEmbedding('test input')

    // Verify fetch was called correctly
    expect(fetch).toHaveBeenCalledWith(`${OPENAI_WORKER_URL}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: 'test input' }),
    })

    // Verify the embedding was normalised
    const magnitude = Math.sqrt(mockEmbedding.reduce((sum, val) => sum + val * val, 0))
    const expectednormalisedVector = mockEmbedding.map(val => val / magnitude)
    expect(result).toEqual(expectednormalisedVector)
  })

  it('should handle fetch errors', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    await expect(createEmbedding('test input')).rejects.toThrow('Network error')
  })
})

describe('normaliseEmbeddingVector', () => {
  it('should normalise a non-zero vector', () => {
    const input = [3, 4]  // 3-4-5 triangle for easy magnitude calculation
    const result = normaliseEmbeddingVector(input)
    
    // Expected values: [3/5, 4/5]
    expect(result[0]).toBeCloseTo(0.6)
    expect(result[1]).toBeCloseTo(0.8)
  })

  it('should handle zero magnitude vectors', () => {
    const input = [0, 0, 0]
    const result = normaliseEmbeddingVector(input)
    
    expect(result).toEqual([0, 0, 0])
  })

  it('should preserve vector direction', () => {
    const input = [-2, 2]
    const result = normaliseEmbeddingVector(input)
    
    // Check if signs are preserved and magnitude is 1
    expect(Math.sign(result[0])).toBe(-1)
    expect(Math.sign(result[1])).toBe(1)
    expect(Math.sqrt(result[0] ** 2 + result[1] ** 2)).toBeCloseTo(1)
  })
})

describe('initialiseEmbeddingsStorage', () => {

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialise embeddings storage with the provided base URL', async () => {
    const mockResponse = { data: 'test data' }
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse)
    })

    const result = await initialiseEmbeddingsStorage('https://example.com')

    expect(fetch).toHaveBeenCalledWith('https://example.com/api/embeddings-seed', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'force-cache'
    })
    expect(result).toEqual(mockResponse)
  })

  it('should handle non-ok responses', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404
    })

    await expect(initialiseEmbeddingsStorage('https://example.com'))
      .rejects
      .toThrow('HTTP error! status: 404')
  })

  it('should handle network errors', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    await expect(initialiseEmbeddingsStorage('https://example.com'))
      .rejects
      .toThrow('Network error')
  })
})