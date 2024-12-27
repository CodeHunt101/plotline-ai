import { MoodType, MovieFormData, MovieType } from '@/types/movie'
import TextAreaField from '../ui/TextAreaField'
import TabGroup from '../ui/TabGroup'
import { MOOD_TYPES, MOVIE_TYPES } from '@/constants/movies'

const MovieFormFields: React.FC<{
  formData: MovieFormData
  validationErrors: { favouriteMovie: boolean; favouriteFilmPerson: boolean }
  handleTextChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  handleTypeChange: <T extends string>(
    type: T,
    field: keyof Pick<MovieFormData, 'movieType' | 'moodType'>
  ) => void
}> = ({ formData, validationErrors, handleTextChange, handleTypeChange }) => (
  <>
    <TextAreaField
      label="What's your favourite movie and why?"
      name="favouriteMovie"
      value={formData.favouriteMovie}
      onChange={handleTextChange}
      error={validationErrors.favouriteMovie}
      placeholder="Please enter your answer here"
    />

    <TabGroup
      options={MOVIE_TYPES}
      value={formData.movieType}
      onChange={(type) => handleTypeChange(type as MovieType, 'movieType')}
      label="Are you in the mood for something new or a classic?"
    />

    <TabGroup
      options={MOOD_TYPES}
      value={formData.moodType}
      onChange={(type) => handleTypeChange(type as MoodType, 'moodType')}
      label="What are you in the mood for?"
    />

    <TextAreaField
      label="Which famous film person would you love to be stranded on an island with and why?"
      name="favouriteFilmPerson"
      value={formData.favouriteFilmPerson}
      onChange={handleTextChange}
      error={validationErrors.favouriteFilmPerson}
      placeholder="Please enter your answer here"
    />
  </>
)

export default MovieFormFields
