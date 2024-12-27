import { render } from '@testing-library/react'
import Logo from './Logo'
import { usePathname } from 'next/navigation'

// Mock the next/navigation module
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

// Mock the next/image component
jest.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  },
}))

// Mock the image import
jest.mock('@/public/popcorn.png', () => ({
  src: '/mocked-popcorn.png',
  height: 100,
  width: 100,
}))

describe('Logo Component', () => {
  it('renders the logo when pathname is not /recommendations', () => {
    // Mock the pathname to be something other than /recommendations
    ;(usePathname as jest.Mock).mockReturnValue('/home')

    const { container } = render(<Logo />)
    const image = container.querySelector('img')

    expect(image).toBeInTheDocument()
  })

  it('does not render when pathname is /recommendations', () => {
    // Mock the pathname to be /recommendations
    ;(usePathname as jest.Mock).mockReturnValue('/recommendations')

    const { container } = render(<Logo />)
    const image = container.querySelector('img')

    expect(image).not.toBeInTheDocument()
  })

  it('uses correct alt text', () => {
    ;(usePathname as jest.Mock).mockReturnValue('/home')

    const { container } = render(<Logo />)
    const image = container.querySelector('img')

    expect(image).toHaveAttribute('alt', 'Popcorn')
  })

  // Test cleanup after each test
  afterEach(() => {
    jest.clearAllMocks()
  })
})
