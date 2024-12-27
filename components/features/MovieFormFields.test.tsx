import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MovieFormData } from '@/types/movie'
import MovieFormFields from './MovieFormFields'
import { MOVIE_TYPES } from '@/constants/movies'

const mockHandleTextChange = jest.fn()
const mockHandleTypeChange = jest.fn()

const defaultFormData: MovieFormData = {
  favouriteMovie: '',
  movieType: 'new',
  moodType: 'fun',
  favouriteFilmPerson: '',
}

const defaultValidationErrors = {
  favouriteMovie: false,
  favouriteFilmPerson: false,
}

describe('MovieFormFields Component', () => {
  it('renders all form fields correctly', () => {
    render(
      <MovieFormFields
        formData={defaultFormData}
        validationErrors={defaultValidationErrors}
        handleTextChange={mockHandleTextChange}
        handleTypeChange={mockHandleTypeChange}
      />
    )

    // Check for TextAreaFields
    expect(
      screen.getByLabelText("What's your favourite movie and why?")
    ).toBeInTheDocument()
    expect(
      screen.getByLabelText(
        'Which famous film person would you love to be stranded on an island with and why?'
      )
    ).toBeInTheDocument()

    // Check for TabGroups
    expect(
      screen.getByText('Are you in the mood for something new or a classic?')
    ).toBeInTheDocument()
    expect(
      screen.getByText('What are you in the mood for?')
    ).toBeInTheDocument()
  })

  it('calls handleTextChange when text is entered in TextAreaField', () => {
    render(
      <MovieFormFields
        formData={defaultFormData}
        validationErrors={defaultValidationErrors}
        handleTextChange={mockHandleTextChange}
        handleTypeChange={mockHandleTypeChange}
      />
    )

    const movieInput = screen.getByLabelText(
      "What's your favourite movie and why?"
    ) as HTMLTextAreaElement

    fireEvent.change(movieInput, { target: { value: 'Inception' } })

    waitFor(() => {
      expect(mockHandleTextChange).toHaveBeenCalledTimes(1)
      expect(mockHandleTextChange).toHaveBeenCalledWith(
        expect.objectContaining({ target: { value: 'Inception' } })
      )
    })
  })

  it('calls handleTypeChange when TabGroup is clicked', () => {
    render(
      <MovieFormFields
        formData={defaultFormData}
        validationErrors={defaultValidationErrors}
        handleTextChange={mockHandleTextChange}
        handleTypeChange={mockHandleTypeChange}
      />
    )

    const newTypeOption = screen.getByText('Classic')
    fireEvent.click(newTypeOption)

    waitFor(() => {
      expect(mockHandleTypeChange).toHaveBeenCalledTimes(1)
      expect(mockHandleTypeChange).toHaveBeenCalledWith(
        MOVIE_TYPES[1],
        'movieType'
      )
    })
  })

  it('displays validation error when passed as prop', () => {
    const errorFormData = {
      ...defaultFormData,
      favouriteMovie: '',
      favouriteFilmPerson: '',
    }
    const validationErrors = {
      favouriteMovie: true,
      favouriteFilmPerson: true,
    }

    render(
      <MovieFormFields
        formData={errorFormData}
        validationErrors={validationErrors}
        handleTextChange={mockHandleTextChange}
        handleTypeChange={mockHandleTypeChange}
      />
    )

    waitFor(() => {
      expect(
        screen.getByText('Please enter your answer here')
      ).toBeInTheDocument()
    })
  })
})
