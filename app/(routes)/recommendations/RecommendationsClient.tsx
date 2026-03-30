"use client";

import { useMovieContext } from "@/contexts/MovieContext";
import { useRouter } from "next/navigation";
import { useEffect, useReducer } from "react";
import Image from "next/image";
import { searchMoviePoster } from "@/lib/services/tmdb";

type RecommendationsState = {
  currentIndex: number;
  posterUrls: Record<string, string>;
  isLoadingPoster: boolean;
};

const initialRecommendationsState: RecommendationsState = {
  currentIndex: 0,
  posterUrls: {},
  isLoadingPoster: true,
};

type RecommendationsAction =
  | { type: "NEXT"; totalMovies: number }
  | { type: "POSTER_CACHE_HIT" }
  | { type: "POSTER_FETCH_START" }
  | { type: "POSTER_FETCH_SUCCESS"; name: string; url: string }
  | { type: "POSTER_FETCH_ERROR"; name: string };

function recommendationsViewReducer(
  state: RecommendationsState,
  action: RecommendationsAction
): RecommendationsState {
  switch (action.type) {
    case "NEXT":
      return {
        ...state,
        currentIndex: state.currentIndex === action.totalMovies - 1 ? 0 : state.currentIndex + 1,
      };
    case "POSTER_CACHE_HIT":
      return { ...state, isLoadingPoster: false };
    case "POSTER_FETCH_START":
      return { ...state, isLoadingPoster: true };
    case "POSTER_FETCH_SUCCESS":
      return {
        ...state,
        isLoadingPoster: false,
        posterUrls: { ...state.posterUrls, [action.name]: action.url },
      };
    case "POSTER_FETCH_ERROR":
      return {
        ...state,
        isLoadingPoster: false,
        posterUrls: { ...state.posterUrls, [action.name]: "" },
      };
  }
}

export default function RecommendationsClient() {
  const { recommendations, resetMovieSession } = useMovieContext();
  const router = useRouter();
  const [state, dispatch] = useReducer(recommendationsViewReducer, initialRecommendationsState);
  const { currentIndex, posterUrls, isLoadingPoster } = state;

  useEffect(() => {
    if (recommendations) return;

    router.replace("/");
  }, [recommendations, router]);

  useEffect(() => {
    if (!recommendations) return;

    const movies = recommendations.result.recommendedMovies;
    if (!movies.length) return;

    const currentMovie = movies[currentIndex];
    if (!currentMovie?.name) return;

    if (posterUrls[currentMovie.name] !== undefined) {
      dispatch({ type: "POSTER_CACHE_HIT" });
      return;
    }

    let cancelled = false;

    void (async () => {
      dispatch({ type: "POSTER_FETCH_START" });
      try {
        const url = await searchMoviePoster(currentMovie.name);
        if (!cancelled) {
          dispatch({
            type: "POSTER_FETCH_SUCCESS",
            name: currentMovie.name,
            url: url || "",
          });
        }
      } catch (error) {
        console.error("Error fetching poster:", error);
        if (!cancelled) {
          dispatch({ type: "POSTER_FETCH_ERROR", name: currentMovie.name });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [recommendations, currentIndex, posterUrls]);

  if (!recommendations) {
    return null;
  }

  const { result } = recommendations;

  const handleNextMovie = () => {
    dispatch({ type: "NEXT", totalMovies: result.recommendedMovies.length });
  };

  const currentMovie = result.recommendedMovies[currentIndex];
  const currentPosterUrl = currentMovie?.name ? posterUrls[currentMovie.name] : "";

  return (
    <>
      {result.recommendedMovies.length ? (
        <div className="mt-6">
          {currentMovie?.name && (
            <>
              <div className="text-3xl text-center">
                {`${currentMovie.name} (${currentMovie?.releaseYear})`}
              </div>
              {isLoadingPoster ? (
                <div
                  data-testid="poster-loading"
                  className="w-64 h-96 bg-gray-700 animate-pulse rounded-lg mx-auto mt-6"
                />
              ) : currentPosterUrl ? (
                <div className="relative w-[325px] h-[480px] mx-auto mt-6">
                  <Image
                    src={currentPosterUrl}
                    alt={currentMovie.name}
                    className="rounded-3xl object-cover"
                    priority
                    fill
                    sizes="325px"
                  />
                </div>
              ) : null}
            </>
          )}
          <div className="text-lg mt-5 text-justify">{currentMovie?.synopsis}</div>

          <div className="mt-4 text-sm text-gray-500">
            Movie {currentIndex + 1} of {result.recommendedMovies.length}
          </div>
          <button
            onClick={handleNextMovie}
            className="btn btn-primary block mb-3 mx-auto text-3xl w-full mt-6"
          >
            Next Movie
          </button>
        </div>
      ) : (
        <div>No recommendations found</div>
      )}
      <button
        onClick={() => {
          resetMovieSession();
        }}
        className="btn btn-secondary block my-3 mx-auto text-xl w-full"
      >
        Start Over
      </button>
    </>
  );
}
