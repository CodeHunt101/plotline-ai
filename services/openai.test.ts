import { createEmbedding, getChatCompletion } from './openai'
import { openai } from '@/lib/config/openai'
import { normaliseEmbedding } from '@/lib/utils/seed'

// Mock dependencies
jest.mock('@/lib/config/openai')
jest.mock('@/lib/utils/seed')

describe('OpenAI functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createEmbedding', () => {
    it('should create and normalize embeddings correctly', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3]
      const mockNormalisedEmbedding = [0.2, 0.4, 0.6]

      // Mock OpenAI response
      ;(openai.embeddings.create as jest.Mock).mockResolvedValue({
        data: [
          {
            embedding: mockEmbedding,
          },
        ],
      })

      // Mock normalization function
      ;(normaliseEmbedding as jest.Mock).mockReturnValue(
        mockNormalisedEmbedding
      )

      const result = await createEmbedding('test input')

      // Verify OpenAI API was called with correct parameters
      expect(openai.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'test input',
      })

      // Verify normalization was called with the embedding
      expect(normaliseEmbedding).toHaveBeenCalledWith(mockEmbedding)

      // Verify final result
      expect(result).toEqual(mockNormalisedEmbedding)
    })

    it('should handle OpenAI API errors', async () => {
      ;(openai.embeddings.create as jest.Mock).mockRejectedValue(
        new Error('API Error')
      )

      await expect(createEmbedding('test input')).rejects.toThrow('API Error')
    })
  })

  describe('getChatCompletion', () => {
    let consoleLogSpy: jest.SpyInstance

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
    })

    afterEach(() => {
      consoleLogSpy.mockRestore()
    })

    it('should return undefined when no text is provided', async () => {
      const result = await getChatCompletion('', 'query')

      expect(result).toBeUndefined()
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "Sorry, I couldn't find any relevant information about that."
      )
    })

    it('should process chat completion successfully', async () => {
      const mockResponse = {
        recommendedMovies: [
          {
            name: 'Test Movie',
            releaseYear: '2023',
            synopsis: 'Test synopsis',
          },
        ],
      }

      ;(openai.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify(mockResponse),
            },
          },
        ],
      })

      const result = await getChatCompletion(
        'movie context',
        'user preferences'
      )

      expect(openai.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('movie context'),
          }),
        ]),
        temperature: 0.65,
        frequency_penalty: 0.5,
        response_format: {
          type: 'json_object',
        },
      })

      expect(result).toBe(JSON.stringify(mockResponse))
    })

    it('should maintain chat history when provided', async () => {
      const previousMessages = [
        {
          role: 'user' as const,
          content: 'previous message',
        },
        {
          role: 'assistant' as const,
          content: 'previous response',
        },
      ]

      ;(openai.chat.completions.create as jest.Mock).mockResolvedValue({
        choices: [
          {
            message: {
              content: '{}',
            },
          },
        ],
      })

      await getChatCompletion(
        'movie context',
        'user preferences',
        previousMessages
      )

      const callArgs = (openai.chat.completions.create as jest.Mock).mock
        .calls[0][0]
      expect(callArgs.messages).toHaveLength(4) // system + 2 previous + new user message
    })
  })
})
