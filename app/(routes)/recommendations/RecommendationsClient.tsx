"use client";

import { useMovieContext } from "@/contexts/MovieContext";
import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef } from "react";
import Image from "next/image";
import { searchMoviePoster } from "@/lib/services/tmdb";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { movieRecommendationSchema } from "@/types/api";

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
  const { participantsData, timeAvailable, resetMovieSession } = useMovieContext();
  const router = useRouter();
  const [state, dispatch] = useReducer(recommendationsViewReducer, initialRecommendationsState);
  const { currentIndex, posterUrls, isLoadingPoster } = state;
  const hasSubmittedRef = useRef(false);
  const wasStoppedRef = useRef(false);

  useEffect(() => {
    if (participantsData.length === 0) {
      router.replace("/");
    }
  }, [participantsData, router]);

  const { object, submit, isLoading, error, clear, stop } = useObject({
    api: "/api/recommendations",
    schema: movieRecommendationSchema,
  });

  useEffect(() => {
    if (participantsData.length === 0) return;
    if (hasSubmittedRef.current && !wasStoppedRef.current) return;

    hasSubmittedRef.current = true;
    wasStoppedRef.current = false;
    void submit({ participantsData, timeAvailable });
  }, [participantsData, timeAvailable, submit]);

  useEffect(() => {
    return () => {
      wasStoppedRef.current = true;
      stop();
    };
  }, [stop]);

  const recommendedMovies = object?.recommendedMovies || [];
  const currentMovie = recommendedMovies[currentIndex];
  const currentMovieName = currentMovie?.name?.trim() || "";
  const currentMovieReleaseYear = currentMovie?.releaseYear?.trim() || "";
  const currentMovieSynopsis = currentMovie?.synopsis?.trim() || "";
  const hasRenderableCurrentMovie =
    Boolean(currentMovieName) &&
    (!isLoading || Boolean(currentMovieReleaseYear) || Boolean(currentMovieSynopsis));
  const hasNoRecommendations =
    Array.isArray(object?.recommendedMovies) &&
    !isLoading &&
    !error &&
    recommendedMovies.length === 0;

  useEffect(() => {
    if (!hasRenderableCurrentMovie) return;

    if (posterUrls[currentMovieName] !== undefined) {
      dispatch({ type: "POSTER_CACHE_HIT" });
      return;
    }

    let cancelled = false;
    dispatch({ type: "POSTER_FETCH_START" });
    void searchMoviePoster(currentMovieName)
      .then((url) => {
        if (!cancelled) {
          dispatch({
            type: "POSTER_FETCH_SUCCESS",
            name: currentMovieName,
            url: url || "",
          });
        }
      })
      .catch((error) => {
        console.error("Error fetching poster:", error);
        if (!cancelled) {
          dispatch({ type: "POSTER_FETCH_ERROR", name: currentMovieName });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentMovieName, hasRenderableCurrentMovie, posterUrls]);

  const handleNextMovie = () => {
    dispatch({ type: "NEXT", totalMovies: recommendedMovies.length });
  };

  const currentPosterUrl = currentMovieName ? posterUrls[currentMovieName] : "";

  return (
    <>
      <div className="mt-6">
        {error && (
          <div
            role="alert"
            className="flex flex-col items-center justify-center p-8 bg-error/10 border border-error/20 rounded-2xl text-center mb-8 mx-auto max-w-md mt-10"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-error mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h3 className="text-2xl font-bold text-error mb-2">Oops! Something went wrong</h3>
            <p className="text-base text-gray-300 mb-6">
              {error.message.includes("All language models exhausted")
                ? "Our AI movie experts are currently overwhelmed with requests. Please try again in a few minutes!"
                : `We ran into a streaming issue: ${error.message}`}
            </p>
          </div>
        )}

        {!hasRenderableCurrentMovie && isLoading && !error && (
          <div
            role="status"
            aria-live="polite"
            className="flex flex-col items-center justify-center h-[35rem] gap-5"
          >
            <div className="text-3xl">Generating recommendations...</div>
            <div className="loading loading-bars loading-lg" aria-hidden="true"></div>
          </div>
        )}

        {hasNoRecommendations && (
          <div
            data-testid="no-recommendations"
            className="flex flex-col items-center justify-center p-8 bg-base-200 border border-base-300 rounded-2xl text-center mb-8 mx-auto max-w-md mt-10"
          >
            <h3 className="text-2xl font-bold mb-2">No strong matches this time</h3>
            <p className="text-base text-gray-300">
              We could not find a confident recommendation for this group yet. Try broadening the
              movie preferences or adding a bit more time, then have another go.
            </p>
          </div>
        )}

        {hasRenderableCurrentMovie && (
          <>
            <h2 className="text-3xl text-center">
              {currentMovieName} {currentMovieReleaseYear ? `(${currentMovieReleaseYear})` : ""}
              {isLoading && currentIndex === recommendedMovies.length - 1 && (
                <span className="loading loading-spinner loading-sm ml-2" aria-hidden="true"></span>
              )}
            </h2>
            {isLoadingPoster ? (
              <div
                data-testid="poster-loading"
                className="w-64 h-96 bg-gray-700 animate-pulse rounded-lg mx-auto mt-6"
              />
            ) : currentPosterUrl ? (
              <div className="relative w-[325px] h-[480px] mx-auto mt-6">
                <Image
                  src={currentPosterUrl}
                  alt={currentMovieName || "Movie poster"}
                  className="rounded-3xl object-cover"
                  priority
                  fill
                  sizes="325px"
                />
              </div>
            ) : null}

            <div className="text-lg mt-5 text-justify">
              {currentMovieSynopsis || (
                <span className="animate-pulse text-gray-400">Generating synopsis...</span>
              )}
            </div>

            <div className="mt-4 text-sm text-gray-400" role="status" aria-live="polite">
              Movie {currentIndex + 1} of {recommendedMovies.length}
            </div>
            <button
              onClick={handleNextMovie}
              disabled={recommendedMovies.length <= 1}
              className="btn btn-primary block mb-3 mx-auto text-3xl w-full mt-6"
            >
              Next Movie
            </button>
          </>
        )}
      </div>

      <button
        onClick={() => {
          clear();
          resetMovieSession();
          router.replace("/");
        }}
        className="btn btn-secondary block my-3 mx-auto text-xl w-full"
      >
        Start Over
      </button>

      {isLoading && process.env.NODE_ENV === "development" && (
        <div
          className="fixed bottom-4 right-4 bg-gray-900 border border-gray-700 text-white p-4 rounded-lg text-sm z-50 shadow-xl max-w-sm"
          data-testid="stream-debugger"
          aria-live="polite"
          aria-label="Stream debugger"
        >
          <div className="flex items-center gap-2 mb-2 font-bold text-success">
            <span className="loading loading-spinner loading-xs" aria-hidden="true"></span>
            AI Stream Active
          </div>
          <div className="text-xs text-gray-300 mb-2">
            Movies parsed from stream so far: {recommendedMovies.length}
          </div>
          <ul className="space-y-1 max-h-40 overflow-y-auto">
            {recommendedMovies.map((m, index) => (
              <li
                key={`${m?.name || "loading"}-${m?.releaseYear || "unknown"}`}
                className="text-xs text-gray-400 truncate"
              >
                {index + 1}. {m?.name || "Loading..."} {m?.releaseYear ? `(${m.releaseYear})` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
