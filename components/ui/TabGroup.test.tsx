import { render, fireEvent } from '@testing-library/react'
import TabGroup from './TabGroup'

describe('TabGroup component', () => {
  const onChange = jest.fn()
  const defaultProps = {
    options: ['option1', 'option2', 'option3'],
    value: 'option1',
    onChange,
    label: 'Test Label',
  }

  it('renders label', () => {
    const { getByText } = render(<TabGroup {...defaultProps} />)
    expect(getByText('Test Label')).toBeInTheDocument()
  })

  it('renders all options', () => {
    const { getAllByRole } = render(<TabGroup {...defaultProps} />)
    expect(getAllByRole('tab')).toHaveLength(defaultProps.options.length)
  })

  it('renders active tab correctly', () => {
    const { getByRole } = render(<TabGroup {...defaultProps} />)
    const activeTab = getByRole('tab', { name: 'Option1' })
    expect(activeTab).toHaveClass('tab-active')
  })

  it('calls onChange when tab is clicked', () => {
    const { getByRole } = render(<TabGroup {...defaultProps} />)
    const tab = getByRole('tab', { name: 'Option2' })
    fireEvent.click(tab)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('renders options with correct capitalisation', () => {
    const { getByText } = render(<TabGroup {...defaultProps} />)
    expect(getByText('Option1')).toBeInTheDocument()
  })
})
