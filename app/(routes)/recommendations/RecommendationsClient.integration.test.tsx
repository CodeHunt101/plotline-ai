import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

function renderRecommendations() {
  return render(
    <MovieProvider>
      <RecommendationsSessionInitialiser>
        <RecommendationsClient />
        <MovieSessionSnapshot />
      </RecommendationsSessionInitialiser>
    </MovieProvider>
  );
}

function getRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

describe("RecommendationsClient integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

      if (url.startsWith("https://api.themoviedb.org/")) {
        return Promise.resolve(
          createJsonResponse(tmdbFixtures.postersByQuery["Mad Max: Fury Road"])
        );
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

  it("renders a no-results state when the streamed response is empty", async () => {
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = getRequestUrl(input);

      if (url === "/api/recommendations") {
        return Promise.resolve(createRecommendationStreamResponse(recommendationFixtures.empty));
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

      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    }) as typeof fetch;

    renderRecommendations();

    await waitFor(() => {
      expect(screen.getByText("Oops! Something went wrong")).toBeInTheDocument();
    });

    expect(screen.getByText(/Pipeline failed/)).toBeInTheDocument();
  });

  it("clears the movie session and routes home when Start Over is pressed", async () => {
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = getRequestUrl(input);

      if (url === "/api/recommendations") {
        return Promise.resolve(createRecommendationStreamResponse());
      }

      if (url.startsWith("https://api.themoviedb.org/")) {
        return Promise.resolve(
          createJsonResponse(tmdbFixtures.postersByQuery["Mad Max: Fury Road"])
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

    fireEvent.click(screen.getByRole("button", { name: "Start Over" }));

    expect(mockReplace).toHaveBeenCalledWith("/");

    await waitFor(() => {
      expect(screen.getByTestId("session-state")).toHaveTextContent('"participantsCount":0');
    });

    expect(screen.getByTestId("session-state")).toHaveTextContent('"timeAvailable":""');
  });
});
