import { getChatCompletion, systemMessage } from './openai'

// Mock the fetch function
global.fetch = jest.fn()

describe('OpenAI Service', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
  })

  describe('getChatCompletion', () => {
    const mockText = 'Movie List Context'
    const mockQuery = 'User Preferences'
    const mockResponse = { content: 'Movie recommendations' }

    it('should return undefined when text is empty', async () => {
      const result = await getChatCompletion('', mockQuery)
      expect(result).toBeUndefined()
    })

    it('should successfully get chat completion', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      })

      const result = await getChatCompletion(mockText, mockQuery)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8787/api/movies',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              systemMessage,
              {
                role: 'user',
                content: `-Movie List Context: ${mockText} \n-User Preferences: ${mockQuery}`,
              },
            ],
          }),
        }
      )

      expect(result).toBe(mockResponse.content)
    })

    it('should include previous messages in the request', async () => {
      const previousMessages = [
        { role: 'user' as const, content: 'previous message' },
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve(mockResponse),
      })

      await getChatCompletion(mockText, mockQuery, previousMessages)

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8787/api/movies',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              systemMessage,
              ...previousMessages,
              {
                role: 'user',
                content: `-Movie List Context: ${mockText} \n-User Preferences: ${mockQuery}`,
              },
            ],
          }),
        }
      )
    })

    it('should throw an error when the API call fails', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'))

      await expect(getChatCompletion(mockText, mockQuery)).rejects.toThrow(
        'API Error'
      )
    })
  })
})
