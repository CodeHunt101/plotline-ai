import { render } from '@testing-library/react'
import MovieNightForm from './page'

jest.mock('@/components/features/ParticipantsSetup', () => {
  const MockParticipantsSetup = () => <div>Mock ParticipantsSetup</div>
  MockParticipantsSetup.displayName = 'MockParticipantsSetup'
  return MockParticipantsSetup
})

describe('MovieNightForm component', () => {
  it('renders ParticipantsSetup component', () => {
    const { getByText } = render(<MovieNightForm />)
    expect(getByText('Mock ParticipantsSetup')).toBeInTheDocument()
  })
})
