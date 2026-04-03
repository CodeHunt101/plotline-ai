import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { StrictMode, useEffect, useState } from "react";
import RecommendationsClient from "./RecommendationsClient";
import { MovieProvider, useMovieContext } from "@/contexts/MovieContext";
import {
  createJsonResponse,
  createRecommendationStreamResponse,
  createTextStreamResponse,
  recommendationFixtures,
  tmdbFixtures,
} from "../../../tests/support/movie-test-fixtures";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

const mockReplace = jest.fn();
const originalFetch = global.fetch;

// Mock IntersectionObserver
const mockObserve = jest.fn();
const mockDisconnect = jest.fn();
let intersectionCallback: (entries: IntersectionObserverEntry[]) => void;

global.IntersectionObserver = jest.fn((callback) => {
  intersectionCallback = callback;
  return {
    observe: mockObserve,
    disconnect: mockDisconnect,
    unobserve: jest.fn(),
    takeRecords: jest.fn(),
    root: null,
    rootMargin: "",
    thresholds: [],
  };
}) as unknown as jest.Mock;

const seededParticipantsData = [
  {
    favouriteMovie: "Inception",
    movieType: "new" as const,
    moodType: "fun" as const,
    favouriteFilmPerson: "Keanu Reeves",
  },
];

function RecommendationsSessionInitialiser({ children }: { children: React.ReactNode }) {
  const { setGroupTimeAvailable, setParticipantsData } = useMovieContext();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setParticipantsData(seededParticipantsData);
    setGroupTimeAvailable("2 hours");
    setIsReady(true);
  }, [setGroupTimeAvailable, setParticipantsData]);

  return isReady ? <>{children}</> : null;
}

function MovieSessionSnapshot() {
  const { participantsData, timeAvailable } = useMovieContext();

  return (
    <output data-testid="session-state">
      {JSON.stringify({
        participantsCount: participantsData.length,
        timeAvailable,
      })}
    </output>
  );
}

function renderRecommendations({ strictMode = false }: { strictMode?: boolean } = {}) {
  const content = (
    <MovieProvider>
      <RecommendationsSessionInitialiser>
        <RecommendationsClient />
        <MovieSessionSnapshot />
      </RecommendationsSessionInitialiser>
    </MovieProvider>
  );

  return render(strictMode ? <StrictMode>{content}</StrictMode> : content);
}

function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

describe("RecommendationsClient integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    (useRouter as jest.Mock).mockReturnValue({ replace: mockReplace });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("shows a loading state before rendering streamed recommendations", async () => {
    let resolveRecommendationResponse: ((response: Response) => void) | undefined;

    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = getRequestUrl(input);

      if (url === "/api/recommendations") {
        return new Promise<Response>((resolve) => {
          resolveRecommendationResponse = resolve;
        });
      }

      if (url.includes("/search/movie")) {
        return Promise.resolve(
          createJsonResponse(tmdbFixtures.postersByQuery["Mad Max: Fury Road"])
        );
      }

      if (url.includes("/watch/providers")) {
        return Promise.resolve(
          createJsonResponse({
            id: 12345,
            results: {
              AU: {
                link: "https://example.com",
                flatrate: [
                  {
                    logo_path: "/au.jpg",
                    provider_id: 1,
                    provider_name: "Test",
                    display_priority: 1,
                  },
                ],
              },
            },
          })
        );
      }

      if (url.startsWith("https://api.country.is")) {
        return Promise.resolve(createJsonResponse({ country: "AU" }));
      }

      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    }) as typeof fetch;

    renderRecommendations();

    await waitFor(() => {
      expect(screen.getByText("Generating recommendations...")).toBeInTheDocument();
    });

    await act(async () => {
      resolveRecommendationResponse?.(createRecommendationStreamResponse());
    });

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Mad Max: Fury Road (2015)" })
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Movie 1 of 2")).toBeInTheDocument();
    expect(screen.getByAltText("Mad Max: Fury Road")).toBeInTheDocument();
  });

  it("still submits recommendations in strict mode after effect replay", async () => {
    let recommendationRequestCount = 0;

    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = getRequestUrl(input);

      if (url === "/api/recommendations") {
        recommendationRequestCount += 1;
        return Promise.resolve(createRecommendationStreamResponse());
      }

      if (url.includes("/search/movie")) {
        return Promise.resolve(
          createJsonResponse(tmdbFixtures.postersByQuery["Mad Max: Fury Road"])
        );
      }

      if (url.includes("/watch/providers")) {
        return Promise.resolve(
          createJsonResponse({
            id: 12345,
            results: {
              AU: {
                link: "https://example.com",
                flatrate: [
                  {
                    logo_path: "/au.jpg",
                    provider_id: 1,
                    provider_name: "Test",
                    display_priority: 1,
                  },
                ],
              },
            },
          })
        );
      }

      if (url.startsWith("https://api.country.is")) {
        return Promise.resolve(createJsonResponse({ country: "AU" }));
      }

      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    }) as typeof fetch;

    renderRecommendations({ strictMode: true });

    await waitFor(() => {
      expect(recommendationRequestCount).toBeGreaterThan(0);
      expect(
        screen.getByRole("heading", { name: "Mad Max: Fury Road (2015)" })
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Movie 1 of 2")).toBeInTheDocument();
  });

  it("renders a no-results state when the streamed response is empty", async () => {
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = getRequestUrl(input);

      if (url === "/api/recommendations") {
        return Promise.resolve(createRecommendationStreamResponse(recommendationFixtures.empty));
      }

      if (url.startsWith("https://api.country.is")) {
        return Promise.resolve(createJsonResponse({ country: "AU" }));
      }

      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    }) as typeof fetch;

    renderRecommendations();

    await waitFor(() => {
      expect(screen.getByText("No strong matches this time")).toBeInTheDocument();
    });
  });

  it("renders the streaming error state when the recommendations request fails", async () => {
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = getRequestUrl(input);

      if (url === "/api/recommendations") {
        return Promise.resolve(
          createTextStreamResponse("Pipeline failed", {
            status: 500,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
            },
          })
        );
      }

      if (url.startsWith("https://api.country.is")) {
        return Promise.resolve(createJsonResponse({ country: "AU" }));
      }

      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    }) as typeof fetch;

    renderRecommendations();

    await waitFor(() => {
      expect(screen.getByText("Oops! Something went wrong")).toBeInTheDocument();
    });

    expect(screen.getByText(/Pipeline failed/)).toBeInTheDocument();
  });

  it("renders an error message when the recommendations request cannot be reached at the network level", async () => {
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = getRequestUrl(input);

      if (url === "/api/recommendations") {
        return Promise.reject(new Error("Failed to fetch"));
      }

      if (url.startsWith("https://api.country.is")) {
        return Promise.resolve(createJsonResponse({ country: "AU" }));
      }

      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    }) as typeof fetch;

    renderRecommendations();

    await waitFor(() => {
      expect(screen.getByText("Oops! Something went wrong")).toBeInTheDocument();
    });
  });

  it("clears the movie session and routes home when Start Over is pressed", async () => {
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = getRequestUrl(input);

      if (url === "/api/recommendations") {
        return Promise.resolve(createRecommendationStreamResponse());
      }

      if (url.includes("/search/movie")) {
        return Promise.resolve(
          createJsonResponse(tmdbFixtures.postersByQuery["Mad Max: Fury Road"])
        );
      }

      if (url.includes("/watch/providers")) {
        return Promise.resolve(
          createJsonResponse({
            id: 12345,
            results: {
              AU: {
                link: "https://example.com",
                flatrate: [
                  {
                    logo_path: "/au.jpg",
                    provider_id: 1,
                    provider_name: "Test",
                    display_priority: 1,
                  },
                ],
              },
            },
          })
        );
      }

      if (url.startsWith("https://api.country.is")) {
        return Promise.resolve(createJsonResponse({ country: "AU" }));
      }

      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    }) as typeof fetch;

    renderRecommendations();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Mad Max: Fury Road (2015)" })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Start Over" }));

    expect(mockReplace).toHaveBeenCalledWith("/");

    await waitFor(() => {
      expect(screen.getByTestId("session-state")).toHaveTextContent('"participantsCount":0');
    });

    expect(screen.getByTestId("session-state")).toHaveTextContent('"timeAvailable":""');
  });

  it("prefetches the next movie poster when the Next Movie button is in view", async () => {
    const fetchUrls: string[] = [];
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = getRequestUrl(input);
      fetchUrls.push(url);

      if (url === "/api/recommendations") {
        return Promise.resolve(createRecommendationStreamResponse());
      }

      if (url.includes("/search/movie")) {
        return Promise.resolve(
          createJsonResponse(tmdbFixtures.postersByQuery["Mad Max: Fury Road"])
        );
      }

      if (url.includes("/watch/providers")) {
        return Promise.resolve(
          createJsonResponse({
            id: 12345,
            results: {
              AU: {
                link: "https://example.com",
                flatrate: [
                  {
                    logo_path: "/au.jpg",
                    provider_id: 1,
                    provider_name: "Test",
                    display_priority: 1,
                  },
                ],
              },
            },
          })
        );
      }

      if (url.startsWith("https://api.country.is")) {
        return Promise.resolve(createJsonResponse({ country: "AU" }));
      }

      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    }) as typeof fetch;

    renderRecommendations();

    // Wait for the first movie to render
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Mad Max: Fury Road (2015)" })
      ).toBeInTheDocument();
    });

    // Simulate the Next Movie button becoming visible
    act(() => {
      intersectionCallback([
        { isIntersecting: true, target: {} as Element } as IntersectionObserverEntry,
      ]);
    });

    // Verify that the second movie (Paddington 2 from fixtures) is being fetched
    await waitFor(() => {
      const searchForPaddington = fetchUrls.some((url) => url.includes("Paddington%202"));
      expect(searchForPaddington).toBe(true);
    });

    // Simulate the Next Movie button becoming visible again — fetchControllersRef deduplicates
    // concurrent requests, so even if the observer fires before the cache is written no second
    // network call is actually made.
    act(() => {
      intersectionCallback([
        { isIntersecting: true, target: {} as Element } as IntersectionObserverEntry,
      ]);
    });

    // At least one search for Paddington 2 must have been issued (prefetch branch hit)
    expect(fetchUrls.filter((url) => url.includes("Paddington%202")).length).toBeGreaterThanOrEqual(
      1
    );
  });

  it("does not prefetch when the Next Movie button is not intersecting", async () => {
    const fetchUrls: string[] = [];

    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = getRequestUrl(input);
      fetchUrls.push(url);

      if (url === "/api/recommendations") {
        return Promise.resolve(createRecommendationStreamResponse());
      }
      if (url.includes("/search/movie")) {
        return Promise.resolve(
          createJsonResponse(tmdbFixtures.postersByQuery["Mad Max: Fury Road"])
        );
      }
      if (url.includes("/watch/providers")) {
        return Promise.resolve(
          createJsonResponse({
            id: 12345,
            results: {
              AU: {
                link: "https://example.com",
                flatrate: [
                  {
                    logo_path: "/au.jpg",
                    provider_id: 1,
                    provider_name: "Test",
                    display_priority: 1,
                  },
                ],
              },
            },
          })
        );
      }
      if (url.startsWith("https://api.country.is")) {
        return Promise.resolve(createJsonResponse({ country: "AU" }));
      }
      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    }) as typeof fetch;

    renderRecommendations();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Mad Max: Fury Road (2015)" })
      ).toBeInTheDocument();
    });

    act(() => {
      intersectionCallback([
        { isIntersecting: false, target: {} as Element } as IntersectionObserverEntry,
      ]);
    });

    await act(async () => {});

    expect(fetchUrls.some((url) => url.includes("Paddington%202"))).toBe(false);
  });

  it("does not prefetch when only one movie is available", async () => {
    const fetchUrls: string[] = [];

    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = getRequestUrl(input);
      fetchUrls.push(url);

      if (url === "/api/recommendations") {
        return Promise.resolve(
          createRecommendationStreamResponse(recommendationFixtures.singleMovie)
        );
      }
      if (url.includes("/search/movie")) {
        return Promise.resolve(
          createJsonResponse(tmdbFixtures.postersByQuery["Mad Max: Fury Road"])
        );
      }
      if (url.includes("/watch/providers")) {
        return Promise.resolve(
          createJsonResponse({
            id: 12345,
            results: {
              AU: {
                link: "https://example.com",
                flatrate: [
                  {
                    logo_path: "/au.jpg",
                    provider_id: 1,
                    provider_name: "Test",
                    display_priority: 1,
                  },
                ],
              },
            },
          })
        );
      }
      if (url.startsWith("https://api.country.is")) {
        return Promise.resolve(createJsonResponse({ country: "AU" }));
      }
      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    }) as typeof fetch;

    renderRecommendations();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Mad Max: Fury Road (2015)" })
      ).toBeInTheDocument();
    });

    act(() => {
      intersectionCallback([
        { isIntersecting: true, target: {} as Element } as IntersectionObserverEntry,
      ]);
    });

    await act(async () => {});

    expect(fetchUrls.some((url) => url.includes("Paddington%202"))).toBe(false);
  });

  it("does not re-fetch the next movie poster once it is already cached", async () => {
    const fetchUrls: string[] = [];

    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = getRequestUrl(input);
      fetchUrls.push(url);

      if (url === "/api/recommendations") {
        return Promise.resolve(createRecommendationStreamResponse());
      }
      if (url.includes("/search/movie")) {
        if (url.includes("Paddington%202")) {
          return Promise.resolve(createJsonResponse(tmdbFixtures.postersByQuery["Paddington 2"]));
        }
        return Promise.resolve(
          createJsonResponse(tmdbFixtures.postersByQuery["Mad Max: Fury Road"])
        );
      }
      if (url.includes("/watch/providers")) {
        return Promise.resolve(
          createJsonResponse({
            id: 12345,
            results: {
              AU: {
                link: "https://example.com",
                flatrate: [
                  {
                    logo_path: "/au.jpg",
                    provider_id: 1,
                    provider_name: "Test",
                    display_priority: 1,
                  },
                ],
              },
            },
          })
        );
      }
      if (url.startsWith("https://api.country.is")) {
        return Promise.resolve(createJsonResponse({ country: "AU" }));
      }
      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    }) as typeof fetch;

    renderRecommendations();

    // Wait for first movie
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Mad Max: Fury Road (2015)" })
      ).toBeInTheDocument();
    });

    // Trigger background prefetch of Paddington 2
    act(() => {
      intersectionCallback([
        { isIntersecting: true, target: {} as Element } as IntersectionObserverEntry,
      ]);
    });

    // Wait for the prefetch fetch to be issued
    await waitFor(() => {
      expect(fetchUrls.some((url) => url.includes("Paddington%202"))).toBe(true);
    });

    // Navigate to Paddington 2 (cache hit — no second fetch)
    fireEvent.click(screen.getByRole("button", { name: "Next Movie" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Paddington 2 (2017)" })).toBeInTheDocument();
    });

    // Navigate back to Mad Max
    fireEvent.click(screen.getByRole("button", { name: "Next Movie" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Mad Max: Fury Road (2015)" })
      ).toBeInTheDocument();
    });

    const countBefore = fetchUrls.filter((url) => url.includes("Paddington%202")).length;

    // Fire IO — posterUrls["Paddington 2"] is now defined → cache guard skips fetch
    act(() => {
      intersectionCallback([
        { isIntersecting: true, target: {} as Element } as IntersectionObserverEntry,
      ]);
    });

    await act(async () => {});

    expect(fetchUrls.filter((url) => url.includes("Paddington%202")).length).toBe(countBefore);
  });

  it("scrolls to the top when Next Movie is clicked", async () => {
    const scrollSpy = jest.spyOn(window, "scrollTo").mockImplementation(() => {});

    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = getRequestUrl(input);
      if (url === "/api/recommendations") {
        return Promise.resolve(createRecommendationStreamResponse());
      }
      if (url.includes("/search/movie")) {
        return Promise.resolve(
          createJsonResponse(tmdbFixtures.postersByQuery["Mad Max: Fury Road"])
        );
      }
      if (url.includes("/watch/providers")) {
        return Promise.resolve(
          createJsonResponse({
            id: 12345,
            results: {
              AU: {
                link: "https://example.com",
                flatrate: [
                  {
                    logo_path: "/au.jpg",
                    provider_id: 1,
                    provider_name: "Test",
                    display_priority: 1,
                  },
                ],
              },
            },
          })
        );
      }
      if (url.startsWith("https://api.country.is")) {
        return Promise.resolve(createJsonResponse({ country: "AU" }));
      }
      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    }) as typeof fetch;

    renderRecommendations();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Mad Max: Fury Road (2015)" })
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Next Movie" }));

    expect(scrollSpy).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });

    scrollSpy.mockRestore();
  });

  it("waits for geolocation before fetching watch providers", async () => {
    const fetchUrls: string[] = [];
    let resolveCountryResponse: ((response: Response) => void) | undefined;

    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = getRequestUrl(input);
      fetchUrls.push(url);

      if (url === "/api/recommendations") {
        return Promise.resolve(createRecommendationStreamResponse());
      }
      if (url.includes("/search/movie")) {
        return Promise.resolve(
          createJsonResponse(tmdbFixtures.postersByQuery["Mad Max: Fury Road"])
        );
      }
      if (url.startsWith("https://api.country.is")) {
        return new Promise<Response>((resolve) => {
          resolveCountryResponse = resolve;
        });
      }
      if (url.includes("/watch/providers")) {
        return Promise.resolve(
          createJsonResponse({
            id: 12345,
            results: {
              FR: {
                link: "https://fr.example.com",
                flatrate: [
                  {
                    logo_path: "/fr.jpg",
                    provider_id: 33,
                    provider_name: "France Provider",
                    display_priority: 1,
                  },
                ],
              },
            },
          })
        );
      }

      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    }) as typeof fetch;

    renderRecommendations();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Mad Max: Fury Road (2015)" })
      ).toBeInTheDocument();
    });

    expect(fetchUrls.some((url) => url.includes("/watch/providers"))).toBe(false);

    await act(async () => {
      resolveCountryResponse?.(createJsonResponse({ country: "FR" }));
    });

    expect(await screen.findByRole("img", { name: "France Provider" })).toBeInTheDocument();
    expect(fetchUrls.some((url) => url.includes("/watch/providers"))).toBe(true);
  });

  it("keeps the poster visible when watch provider lookup fails", async () => {
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = getRequestUrl(input);

      if (url === "/api/recommendations") {
        return Promise.resolve(createRecommendationStreamResponse());
      }
      if (url.includes("/search/movie")) {
        return Promise.resolve(
          createJsonResponse(tmdbFixtures.postersByQuery["Mad Max: Fury Road"])
        );
      }
      if (url.startsWith("https://api.country.is")) {
        return Promise.resolve(createJsonResponse({ country: "AU" }));
      }
      if (url.includes("/watch/providers")) {
        return Promise.reject(new Error("Provider API unavailable"));
      }

      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    }) as typeof fetch;

    jest.spyOn(console, "error").mockImplementation(() => {});

    renderRecommendations();

    expect(
      await screen.findByAltText("Mad Max: Fury Road", undefined, { timeout: 5000 })
    ).toBeInTheDocument();
    expect(screen.queryByText("Watch Providers")).not.toBeInTheDocument();
  });

  it("keeps the poster visible when geolocation fails", async () => {
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = getRequestUrl(input);

      if (url === "/api/recommendations") {
        return Promise.resolve(createRecommendationStreamResponse());
      }
      if (url.includes("/search/movie")) {
        return Promise.resolve(
          createJsonResponse(tmdbFixtures.postersByQuery["Mad Max: Fury Road"])
        );
      }
      if (url.startsWith("https://api.country.is")) {
        return Promise.reject(new Error("Country lookup unavailable"));
      }
      if (url.includes("/watch/providers")) {
        return Promise.resolve(
          createJsonResponse({
            id: 12345,
            results: {
              AU: {
                link: "https://au.toy",
                flatrate: [
                  {
                    logo_path: "/au.jpg",
                    provider_name: "AU Provider",
                    provider_id: 1,
                    display_priority: 1,
                  },
                ],
              },
            },
          })
        );
      }

      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    }) as typeof fetch;

    jest.spyOn(console, "error").mockImplementation(() => {});

    renderRecommendations();

    expect(
      await screen.findByAltText("Mad Max: Fury Road", undefined, { timeout: 5000 })
    ).toBeInTheDocument();
    expect(screen.queryByText("Watch Providers")).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "AU Provider" })).not.toBeInTheDocument();
  });

  it("does not let background prefetch clear the active poster loading state", async () => {
    let resolveMadMaxPoster: ((value: Response) => void) | undefined;

    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = getRequestUrl(input);

      if (url === "/api/recommendations") {
        return Promise.resolve(createRecommendationStreamResponse());
      }
      if (url.includes("Mad%20Max%3A%20Fury%20Road")) {
        return new Promise<Response>((resolve) => {
          resolveMadMaxPoster = resolve;
        });
      }
      if (url.includes("Paddington%202")) {
        return Promise.resolve(createJsonResponse(tmdbFixtures.postersByQuery["Paddington 2"]));
      }
      if (url.startsWith("https://api.country.is")) {
        return Promise.resolve(createJsonResponse({ country: "AU" }));
      }
      if (url.includes("/watch/providers")) {
        return Promise.resolve(
          createJsonResponse({
            id: 12345,
            results: {
              AU: {
                link: "https://example.com",
                flatrate: [
                  {
                    logo_path: "/au.jpg",
                    provider_id: 1,
                    provider_name: "Test",
                    display_priority: 1,
                  },
                ],
              },
            },
          })
        );
      }

      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    }) as typeof fetch;

    renderRecommendations();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Mad Max: Fury Road (2015)" })
      ).toBeInTheDocument();
      expect(screen.getByTestId("poster-loading")).toBeInTheDocument();
    });

    act(() => {
      intersectionCallback([
        { isIntersecting: true, target: {} as Element } as IntersectionObserverEntry,
      ]);
    });

    await waitFor(() => {
      expect(screen.getByTestId("poster-loading")).toBeInTheDocument();
    });

    await act(async () => {
      resolveMadMaxPoster?.(createJsonResponse(tmdbFixtures.postersByQuery["Mad Max: Fury Road"]));
    });

    expect(await screen.findByAltText("Mad Max: Fury Road")).toBeInTheDocument();
  });

  it("renders free and ad-supported providers", async () => {
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = getRequestUrl(input);

      if (url === "/api/recommendations") {
        return Promise.resolve(createRecommendationStreamResponse());
      }
      if (url.includes("/search/movie")) {
        return Promise.resolve(
          createJsonResponse(tmdbFixtures.postersByQuery["Mad Max: Fury Road"])
        );
      }
      if (url.startsWith("https://api.country.is")) {
        return Promise.resolve(createJsonResponse({ country: "AU" }));
      }
      if (url.includes("/watch/providers")) {
        return Promise.resolve(
          createJsonResponse({
            id: 12345,
            results: {
              AU: {
                link: "https://example.com",
                free: [
                  {
                    logo_path: "/free.jpg",
                    provider_id: 7,
                    provider_name: "Free Provider",
                    display_priority: 1,
                  },
                ],
                ads: [
                  {
                    logo_path: "/ads.jpg",
                    provider_id: 8,
                    provider_name: "Ads Provider",
                    display_priority: 2,
                  },
                ],
              },
            },
          })
        );
      }

      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    }) as typeof fetch;

    renderRecommendations();

    expect(await screen.findByRole("img", { name: "Free Provider" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Ads Provider" })).toBeInTheDocument();
    expect(screen.queryByText("No providers available.")).not.toBeInTheDocument();
  });

  it("does not fall back to AU providers when current country has no data", async () => {
    const fetchUrls: string[] = [];
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = getRequestUrl(input);
      fetchUrls.push(url);

      if (url === "/api/recommendations") {
        return Promise.resolve(createRecommendationStreamResponse());
      }
      if (url.includes("/search/movie")) {
        return Promise.resolve(
          createJsonResponse(tmdbFixtures.postersByQuery["Mad Max: Fury Road"])
        );
      }
      if (url.startsWith("https://api.country.is")) {
        return Promise.resolve(createJsonResponse({ country: "FR" })); // User in France
      }
      if (url.includes("/watch/providers")) {
        // Return results that have AU but not FR to verify we do not cross over to AU.
        return Promise.resolve(
          createJsonResponse({
            id: 12345,
            results: {
              AU: {
                link: "https://au.toy",
                flatrate: [
                  {
                    logo_path: "/au.jpg",
                    provider_name: "AU Provider",
                    provider_id: 1,
                    display_priority: 1,
                  },
                ],
              },
            },
          })
        );
      }
      return Promise.reject(new Error(`Unhandled: ${url}`));
    }) as typeof fetch;

    renderRecommendations();

    expect(
      await screen.findByAltText("Mad Max: Fury Road", undefined, { timeout: 5000 })
    ).toBeInTheDocument();
    expect(screen.queryByText("Watch Providers")).not.toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "AU Provider" })).not.toBeInTheDocument();

    const countryRequests = fetchUrls.filter((u) => u.startsWith("https://api.country.is"));
    const providerRequests = fetchUrls.filter((u) => u.includes("/watch/providers"));
    expect(countryRequests).toHaveLength(1);
    expect(providerRequests).toHaveLength(1);
  });
});
