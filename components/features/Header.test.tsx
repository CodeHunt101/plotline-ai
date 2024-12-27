import { render, screen } from '@testing-library/react'
import Header from './Header'
import { usePathname } from 'next/navigation'

// Mock the child components
jest.mock('./Logo', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-logo">Logo</div>,
}))

jest.mock('./Title', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-title">Title</div>,
}))

// Mock the next/navigation module (needed by child components)
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}))

describe('Header Component', () => {
  it('renders with correct structure and styling', () => {
    render(<Header />)

    const header = screen.getByRole('banner')
    expect(header).toBeInTheDocument()
    expect(header).toHaveClass('flex', 'flex-col', 'items-center', 'w-full')
  })

  it('renders both Logo and Title components', () => {
    render(<Header />)

    const logo = screen.getByTestId('mock-logo')
    const title = screen.getByTestId('mock-title')

    expect(logo).toBeInTheDocument()
    expect(title).toBeInTheDocument()
  })

  it('maintains correct order of child components', () => {
    render(<Header />)

    const header = screen.getByRole('banner')
    const children = header.children

    expect(children[0]).toHaveAttribute('data-testid', 'mock-logo')
    expect(children[1]).toHaveAttribute('data-testid', 'mock-title')
  })

  it('renders header even when children are null', () => {
    // Temporarily mock Logo and Title to return null
    jest.resetModules()
    jest.mock('./Logo', () => ({
      __esModule: true,
      default: () => null,
    }))
    jest.mock('./Title', () => ({
      __esModule: true,
      default: () => null,
    }))

    render(<Header />)

    const header = screen.getByRole('banner')
    expect(header).toBeInTheDocument()
  })

  // Integration test example (optional, as components are already tested individually)
  it('integrates with child components based on pathname', () => {
    // Reset to original mocks
    jest.resetModules()
    jest.mock('./Logo', () => ({
      __esModule: true,
      default: () => <div data-testid="mock-logo">Logo</div>,
    }))
    jest.mock('./Title', () => ({
      __esModule: true,
      default: () => <div data-testid="mock-title">Title</div>,
    }))

    // Test different pathnames
    const { rerender } = render(<Header />) // Render once outside the loop

    ;['/recommendations', '/', '/other'].forEach((path) => {
      ;(usePathname as jest.Mock).mockReturnValue(path)

      rerender(<Header />) // Just rerender with new props

      const header = screen.getByRole('banner')
      expect(header).toBeInTheDocument()
    })
  })

  // Clean up after each test
  afterEach(() => {
    jest.clearAllMocks()
  })
})
