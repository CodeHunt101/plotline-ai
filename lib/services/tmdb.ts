/** Fetches the poster URL for the first TMDb search hit. Requires `NEXT_PUBLIC_TMBD_ACCESS_TOKEN`. Returns nothing on network/API failure. */
export const searchMoviePoster = async (movieTitle: string) => {
  const options = {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMBD_ACCESS_TOKEN}`,
    },
  };

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(movieTitle)}&include_adult=false&language=en-US&page=1`,
      options
    );
    if (!response.ok) {
      throw new Error(`TMDb request failed with status ${response.status}`);
    }
    const data = await response.json();
    const posterPath = data.results?.[0]?.poster_path;

    if (typeof posterPath !== "string" || posterPath.length === 0) {
      return;
    }

    const imageUrl = `https://image.tmdb.org/t/p/w342${posterPath}`;
    return imageUrl;
  } catch (err) {
    console.error(err);
  }
};
