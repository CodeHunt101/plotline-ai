"use client";

import { useMovieContext } from "@/contexts/MovieContext";
import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef } from "react";
import Image from "next/image";
import { searchMoviePoster, getMovieWatchProviders, WatchProvidersData } from "@/lib/services/tmdb";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { movieRecommendationSchema } from "@/types/api";
import { getUserCountry } from "@/lib/utils/geolocation";

type RecommendationsState = {
  currentIndex: number;
  posterUrls: Record<string, string>;
  watchProviders: Record<string, WatchProvidersData | null>;
  loadingPosters: Record<string, boolean>;
};

const initialRecommendationsState: RecommendationsState = {
  currentIndex: 0,
  posterUrls: {},
  watchProviders: {},
  loadingPosters: {},
};

type RecommendationsAction =
  | { type: "NEXT"; totalMovies: number }
  | { type: "POSTER_CACHE_HIT" }
  | { type: "POSTER_FETCH_START"; name: string }
  | {
      type: "POSTER_FETCH_SUCCESS";
      name: string;
      url: string;
      providers: WatchProvidersData | null;
    }
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
      return state;
    case "POSTER_FETCH_START":
      return {
        ...state,
        loadingPosters: { ...state.loadingPosters, [action.name]: true },
      };
    case "POSTER_FETCH_SUCCESS":
      return {
        ...state,
        posterUrls: { ...state.posterUrls, [action.name]: action.url },
        watchProviders: { ...state.watchProviders, [action.name]: action.providers },
        loadingPosters: { ...state.loadingPosters, [action.name]: false },
      };
    case "POSTER_FETCH_ERROR":
      return {
        ...state,
        posterUrls: { ...state.posterUrls, [action.name]: "" },
        watchProviders: { ...state.watchProviders, [action.name]: null },
        loadingPosters: { ...state.loadingPosters, [action.name]: false },
      };
  }
}

export default function RecommendationsClient() {
  const { participantsData, timeAvailable, resetMovieSession } = useMovieContext();
  const router = useRouter();
  const [state, dispatch] = useReducer(recommendationsViewReducer, initialRecommendationsState);
  const { currentIndex, posterUrls, watchProviders, loadingPosters } = state;
  const hasSubmittedRef = useRef(false);
  const wasStoppedRef = useRef(false);
  const userCountryRef = useRef<string | null | undefined>(undefined);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const countryRequestRef = useRef<Promise<string | null> | null>(null);

  function getResolvedUserCountry() {
    if (userCountryRef.current !== undefined) {
      return Promise.resolve(userCountryRef.current);
    }

    if (!countryRequestRef.current) {
      countryRequestRef.current = getUserCountry().then((country) => {
        userCountryRef.current = country;
        return country;
      });
    }

    return countryRequestRef.current;
  }

  useEffect(() => {
    void getResolvedUserCountry();
  }, []);

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

  const recommendedMovies = object?.recommendedMovies ?? [];
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

  const fetchControllersRef = useRef<{ [key: string]: AbortController }>({});

  useEffect(() => {
    const controllers = fetchControllersRef.current;
    return () => {
      Object.values(controllers).forEach((c) => c.abort());
    };
  }, []);

  async function fetchMovieData(movieName: string, isBackground: boolean) {
    if (!movieName || posterUrls[movieName] !== undefined || fetchControllersRef.current[movieName])
      return;

    const controller = new AbortController();
    fetchControllersRef.current[movieName] = controller;

    if (!isBackground) {
      dispatch({ type: "POSTER_FETCH_START", name: movieName });
    }

    try {
      const result = await searchMoviePoster(movieName);
      if (controller.signal.aborted) return;

      if (!result) {
        if (!isBackground) {
          dispatch({ type: "POSTER_FETCH_ERROR", name: movieName });
        }
        return;
      }

      let providers: WatchProvidersData | null = null;
      try {
        const userCountry = await getResolvedUserCountry();
        if (controller.signal.aborted) return;

        if (userCountry) {
          const fetchedProviders = await getMovieWatchProviders(result.id, userCountry);
          if (controller.signal.aborted) return;

          if (fetchedProviders) {
            providers = fetchedProviders;
          }
        }
      } catch (providersError) {
        console.error("Error fetching watch providers:", providersError);
      }

      if (!controller.signal.aborted) {
        dispatch({
          type: "POSTER_FETCH_SUCCESS",
          name: movieName,
          url: result.posterUrl,
          providers,
        });
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") return;
      console.error("Error fetching movie data:", error);
      if (!controller.signal.aborted && !isBackground) {
        dispatch({ type: "POSTER_FETCH_ERROR", name: movieName });
      }
    } finally {
      delete fetchControllersRef.current[movieName];
    }
  }

  useEffect(() => {
    if (!hasRenderableCurrentMovie) return;

    if (posterUrls[currentMovieName] !== undefined) {
      dispatch({ type: "POSTER_CACHE_HIT" });
      return;
    }

    void fetchMovieData(currentMovieName, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMovieName, hasRenderableCurrentMovie, posterUrls]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && recommendedMovies.length > 1) {
          const nextIndex = (currentIndex + 1) % recommendedMovies.length;
          const nextMovie = recommendedMovies[nextIndex];
          const nextMovieName = nextMovie?.name?.trim() || "";

          if (nextMovieName && posterUrls[nextMovieName] === undefined) {
            void fetchMovieData(nextMovieName, true);
          }
        }
      },
      { threshold: 0.1 }
    );

    if (nextButtonRef.current) {
      observer.observe(nextButtonRef.current);
    }

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, recommendedMovies, posterUrls]);

  const handleNextMovie = () => {
    dispatch({ type: "NEXT", totalMovies: recommendedMovies.length });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const currentPosterUrl = currentMovieName ? posterUrls[currentMovieName] : "";
  const currentProviders = currentMovieName ? watchProviders[currentMovieName] : null;
  const isLoadingPoster = currentMovieName ? (loadingPosters[currentMovieName] ?? false) : false;

  // Deduplicate and combine all providers for display
  const allProviders = currentProviders
    ? [
        ...(currentProviders.flatrate || []),
        ...(currentProviders.free || []),
        ...(currentProviders.ads || []),
        ...(currentProviders.rent || []),
        ...(currentProviders.buy || []),
      ].filter((v, i, a) => a.findIndex((t) => t.provider_id === v.provider_id) === i)
    : [];

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

            {currentProviders && (
              <div className="mt-8 border-t border-gray-700 pt-6">
                <h3 className="text-xl font-semibold mb-4 text-center">Watch Providers</h3>
                {allProviders.length > 0 ? (
                  <div className="flex flex-wrap justify-center gap-4">
                    {allProviders.map((provider) => (
                      <div
                        key={provider.provider_id}
                        className="relative w-12 h-12 rounded-xl overflow-hidden shadow-md bg-gray-800"
                        title={provider.provider_name}
                      >
                        <Image
                          src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
                          alt={provider.provider_name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-400">No providers available.</p>
                )}
                {currentProviders.link && (
                  <div className="text-center mt-5">
                    <a
                      href={currentProviders.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-outline px-6"
                    >
                      View on TMDb
                    </a>
                  </div>
                )}
                <div className="text-center mt-3">
                  <small className="text-gray-400">
                    Streaming availability data provided by JustWatch
                  </small>
                </div>
              </div>
            )}

            <div
              className="mt-6 text-sm text-gray-400 text-center"
              role="status"
              aria-live="polite"
            >
              Movie {currentIndex + 1} of {recommendedMovies.length}
            </div>
            {recommendedMovies.length > 1 && (
              <button
                ref={nextButtonRef}
                onClick={handleNextMovie}
                className="btn btn-primary block mb-3 mx-auto text-3xl w-full mt-6 sticky bottom-4 z-10 opacity-75 hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-150 ease-in-out"
              >
                Next Movie
              </button>
            )}
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
