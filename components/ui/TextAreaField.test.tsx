import { render, fireEvent, waitFor } from '@testing-library/react'
import TextAreaField from './TextAreaField'

describe('TextAreaField component', () => {
  const onChange = jest.fn()
  const defaultProps = {
    label: 'Test Label',
    name: 'test-name',
    value: '',
    onChange,
  }

  it('renders correctly', () => {
    const { getByText } = render(<TextAreaField {...defaultProps} />)
    expect(getByText('Test Label')).toBeInTheDocument()
  })

  it('renders with placeholder', () => {
    const { getByPlaceholderText } = render(
      <TextAreaField {...defaultProps} placeholder="Test placeholder" />
    )
    expect(getByPlaceholderText('Test placeholder')).toBeInTheDocument()
  })

  it('renders with error message', () => {
    const { getByText } = render(<TextAreaField {...defaultProps} error />)
    expect(getByText('This field is required')).toBeInTheDocument()
    expect(getByText('Test Label')).toBeInTheDocument()
  })

  it('calls onChange when input changes', () => {
    const { getByRole } = render(<TextAreaField {...defaultProps} />)
    const textarea = getByRole('textbox')
    const testValue = 'Test value'
    fireEvent.change(textarea, { target: { value: testValue } })

    waitFor(() => {
      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          target: expect.objectContaining({ value: testValue }),
        })
      )
    })
  })

  it('renders with error border', () => {
    const { getByRole } = render(<TextAreaField {...defaultProps} error />)
    const textarea = getByRole('textbox')
    expect(textarea).toHaveClass('border-2 border-red-500')
  })
})
