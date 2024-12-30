export const searchMoviePoster = async (movieTitle: string) => {
  const options = {
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMBD_ACCESS_TOKEN}`,
    },
  }

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/search/movie?query=${movieTitle}&include_adult=false&language=en-US&page=1`,
      options
    )
    const data = await response.json()
    const imageUrl = `https://image.tmdb.org/t/p/w342${data.results[0].poster_path}`
    return imageUrl
  } catch (err) {
    console.error(err)
  }
}
