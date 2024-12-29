import { render } from '@testing-library/react'
import ParticipantsSetup from '@/components/features/ParticipantsSetup'
import MovieNightForm from './page'

// Mock the next/headers module
jest.mock('next/headers', () => ({
  headers: jest.fn(() => ({
    get: jest.fn((key) => key === 'host' ? 'localhost:3000' : null)
  }))
}))

// Mock ParticipantsSetup component
jest.mock('@/components/features/ParticipantsSetup', () => {
  return jest.fn(() => null)
})

// Mock global fetch
global.fetch = jest.fn()

describe('MovieNightForm', () => {
  const originalEnv = process.env;
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()

    process.env = { ...originalEnv, NODE_ENV: 'development' };
    
    // Setup default successful fetch response
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    })
  })

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should make API call with correct parameters', async () => {
    // Set NODE_ENV to test development environment
    // jest.spyOn(process.env, 'NODE_ENV', 'get').mockReturnValue('development')
    
    await MovieNightForm()

    // Verify fetch was called with correct parameters
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/embeddings-seed',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  })

  it('should make API call with https in production', async () => {
    // Set NODE_ENV to test production environment
    // jest.spyOn(process.env, 'NODE_ENV', 'get').mockReturnValue('production')
    process.env = { ...originalEnv, NODE_ENV: 'production' };
    await MovieNightForm()

    // Verify fetch was called with https
    expect(global.fetch).toHaveBeenCalledWith(
      'https://localhost:3000/api/embeddings-seed',
      expect.any(Object)
    )
  })

  it('should render ParticipantsSetup component', async () => {
    render(await MovieNightForm())
    
    // Verify ParticipantsSetup was rendered
    expect(ParticipantsSetup).toHaveBeenCalled()
  })

  it('should handle failed API responses gracefully', async () => {
    // Mock a failed API response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500
    })

    render(await MovieNightForm())
    
    // Component should still render even if API call fails
    expect(ParticipantsSetup).toHaveBeenCalled()
  })
})