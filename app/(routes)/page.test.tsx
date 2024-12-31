import { render, screen } from '@testing-library/react'
// import { headers } from 'next/headers'
// import { initialiseEmbeddingsStorage } from '@/services/embeddings'
import MovieNightForm from './page'

// // Mock the dependencies
// jest.mock('next/headers', () => ({
//   headers: jest.fn(),
// }))
// jest.mock('@/services/embeddings', () => ({
//   initialiseEmbeddingsStorage: jest.fn(),
// }))

jest.mock('@/components/features/ParticipantsSetup', () => jest.fn(() => <div data-testid="participants-setup" />))

describe('MovieNightForm Component', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it(`renders ParticipantsSetup when initialisation is successful`, async () => {
    // // Mock headers
    // ;(headers as jest.Mock).mockResolvedValue({
    //   get: jest.fn((key) => {
    //     if (key === 'host') return 'localhost:3000'
    //   }),
    // })
    
    // // Mock initialiseEmbeddingsStorage
    // ;(initialiseEmbeddingsStorage as jest.Mock).mockResolvedValue(undefined)

    render(await MovieNightForm())

    // Assert that ParticipantsSetup is rendered
    expect(screen.getByTestId('participants-setup')).toBeInTheDocument()
  })

  // it('shows error message when initialisation fails', async () => {
  //   // Mock headers
  //   ;(headers as jest.Mock).mockResolvedValue({
  //     get: jest.fn((key) => {
  //       if (key === 'host') return 'localhost:3000'
  //     }),
  //   })

  //   // Mock initialiseEmbeddingsStorage to throw an error
  //   ;(initialiseEmbeddingsStorage as jest.Mock).mockRejectedValue(new Error('Initialization failed'))

  //   render(await MovieNightForm())

  //   // Assert that the error message is rendered
  //   expect(screen.getByText(/Failed to initialise/i)).toBeInTheDocument()
  //   expect(screen.queryByTestId('participants-setup')).not.toBeInTheDocument()
  // })
})
