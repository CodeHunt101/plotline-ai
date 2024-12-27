import { render, screen } from '@testing-library/react'
import Title from './Title'
import { usePathname } from 'next/navigation'

// Mock the next/navigation module
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

describe('Title Component', () => {
  it('renders the title when pathname is /', () => {
    // Mock the pathname to be root
    ;(usePathname as jest.Mock).mockReturnValue('/')

    render(<Title />)
    const heading = screen.getByText('PlotlineAI')

    expect(heading).toBeInTheDocument()
    expect(heading.tagName).toBe('H1')
  })

  it('does not render when pathname is not /', () => {
    // Mock the pathname to be something other than root
    ;(usePathname as jest.Mock).mockReturnValue('/other-page')

    const { container } = render(<Title />)

    expect(container.firstChild).toBeNull()
    expect(screen.queryByText('PlotlineAI')).not.toBeInTheDocument()
  })

  // Test multiple different non-root paths
  it.each(['/about', '/recommendations', '/settings', '/profile'])(
    'does not render for path: %s',
    (path) => {
      ;(usePathname as jest.Mock).mockReturnValue(path)

      const { container } = render(<Title />)
      expect(container.firstChild).toBeNull()
    }
  )

  // Test cleanup after each test
  afterEach(() => {
    jest.clearAllMocks()
  })
})
