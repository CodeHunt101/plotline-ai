export type WatchProvider = {
  logo_path: string;
  provider_id: number;
  provider_name: string;
  display_priority: number;
};

export type WatchProvidersData = {
  link: string;
  flatrate?: WatchProvider[];
  free?: WatchProvider[];
  ads?: WatchProvider[];
  rent?: WatchProvider[];
  buy?: WatchProvider[];
};

/** Fetches the poster URL and movie ID for the first TMDb search hit. Requires `NEXT_PUBLIC_TMBD_ACCESS_TOKEN`. Returns nothing on network/API failure. */
export const searchMoviePoster = async (
  movieTitle: string
): Promise<{ posterUrl: string; id: number } | undefined> => {
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
    const movie = data.results?.[0];
    const posterPath = movie?.poster_path;
    const movieId = movie?.id;

    if (typeof posterPath !== "string" || posterPath.length === 0 || typeof movieId !== "number") {
      return;
    }

    const imageUrl = `https://image.tmdb.org/t/p/w342${posterPath}`;
    return { posterUrl: imageUrl, id: movieId };
  } catch (err) {
    console.error(err);
  }
};

/** Fetches watch providers for a specific movie ID in a specific country. */
export const getMovieWatchProviders = async (
  movieId: number,
  countryCode: string
): Promise<WatchProvidersData | undefined> => {
  const options = {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${process.env.NEXT_PUBLIC_TMBD_ACCESS_TOKEN}`,
    },
  };

  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${movieId}/watch/providers`,
      options
    );
    if (!response.ok) {
      throw new Error(`TMDb request failed with status ${response.status}`);
    }
    const data = await response.json();

    // Returns watch providers for the given country, if they exist
    return data.results?.[countryCode];
  } catch (err) {
    console.error(err);
  }
};
