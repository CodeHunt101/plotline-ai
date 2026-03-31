import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { useMovieContext } from "@/contexts/MovieContext";
import { searchMoviePoster } from "@/lib/services/tmdb";
import Recommendations from "./RecommendationsClient";
import { metadata } from "./page";
import { experimental_useObject } from "@ai-sdk/react";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("next/image", () => ({
  __esModule: true,
  default: jest.requireActual("next/image").default,
}));

jest.mock("@/lib/services/tmdb", () => ({
  searchMoviePoster: jest.fn(),
}));

jest.mock("@/contexts/MovieContext", () => ({
  useMovieContext: jest.fn(),
  MovieProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@ai-sdk/react", () => ({
  experimental_useObject: jest.fn(),
}));

describe("recommendations page metadata", () => {
  it("exports route metadata", () => {
    expect(metadata.title).toBeTruthy();
    expect(metadata.description).toBeTruthy();
    expect(metadata.alternates?.canonical).toBe("/recommendations");
    expect(metadata.robots).toMatchObject({
      index: false,
      follow: true,
    });
  });
});

describe("Recommendations Component", () => {
  const mockPush = jest.fn();
  const mockReplace = jest.fn();
  const mockResetMovieSession = jest.fn();
  const mockSubmit = jest.fn();
  const mockClear = jest.fn();
  const mockStop = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush, replace: mockReplace });
    (useMovieContext as jest.Mock).mockReturnValue({
      participantsData: [{ favouriteMovie: "Matrix" }],
      timeAvailable: "2 hours",
      resetMovieSession: mockResetMovieSession,
    });
    (searchMoviePoster as jest.Mock).mockResolvedValue("http://example.com/poster.jpg");
    (experimental_useObject as jest.Mock).mockReturnValue({
      object: {
        recommendedMovies: [
          { name: "Test Movie 1", releaseYear: "2023", synopsis: "Test synopsis 1" },
          { name: "Test Movie 2", releaseYear: "2024", synopsis: "Test synopsis 2" },
        ],
      },
      submit: mockSubmit,
      isLoading: false,
      error: undefined,
      clear: mockClear,
      stop: mockStop,
    });
  });

  it("navigates home if no participants form data is available", async () => {
    (useMovieContext as jest.Mock).mockReturnValue({
      participantsData: [],
      timeAvailable: "",
      resetMovieSession: mockResetMovieSession,
    });

    render(<Recommendations />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
  });

  it("calls submit on initial render to start the stream if data exists", async () => {
    render(<Recommendations />);
    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith({
        participantsData: [{ favouriteMovie: "Matrix" }],
        timeAvailable: "2 hours",
      });
    });
  });

  it("displays movie information correctly", async () => {
    render(<Recommendations />);

    await waitFor(() => {
      expect(screen.getByText("Test Movie 1 (2023)")).toBeInTheDocument();
      expect(screen.getByText("Test synopsis 1")).toBeInTheDocument();
      expect(screen.getByText("Movie 1 of 2")).toBeInTheDocument();
    });
  });

  it("shows loading state while fetching poster", async () => {
    (searchMoviePoster as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<Recommendations />);

    await waitFor(() => {
      expect(screen.getByTestId("poster-loading")).toBeInTheDocument();
    });
  });

  it("handles next movie button click", async () => {
    render(<Recommendations />);

    const nextButton = screen.getByText("Next Movie");
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText("Test Movie 2 (2024)")).toBeInTheDocument();
      expect(screen.getByText("Test synopsis 2")).toBeInTheDocument();
      expect(screen.getByText("Movie 2 of 2")).toBeInTheDocument();
    });
  });

  it("handles empty objects nicely when stream starts", async () => {
    (experimental_useObject as jest.Mock).mockReturnValue({
      object: undefined,
      submit: mockSubmit,
      isLoading: true,
      error: undefined,
      clear: mockClear,
      stop: mockStop,
    });

    render(<Recommendations />);

    await waitFor(() => {
      expect(screen.getByText("Generating recommendations...")).toBeInTheDocument();
    });
  });
  it("shows the error UI when the stream returns an error", async () => {
    (experimental_useObject as jest.Mock).mockReturnValue({
      object: undefined,
      submit: mockSubmit,
      isLoading: false,
      error: { message: "Something went wrong" },
      clear: mockClear,
      stop: mockStop,
    });

    render(<Recommendations />);

    await waitFor(() => {
      expect(screen.getByText("Oops! Something went wrong")).toBeInTheDocument();
      expect(screen.getByText(/We ran into a streaming issue/)).toBeInTheDocument();
    });
  });

  it("shows the friendly AI-exhausted message when the error contains 'All language models exhausted'", async () => {
    (experimental_useObject as jest.Mock).mockReturnValue({
      object: undefined,
      submit: mockSubmit,
      isLoading: false,
      error: { message: "All language models exhausted" },
      clear: mockClear,
      stop: mockStop,
    });

    render(<Recommendations />);

    await waitFor(() => {
      expect(screen.getByText(/AI movie experts are currently overwhelmed/)).toBeInTheDocument();
    });
  });

  it("shows the stream debugger while loading with movies in the list", async () => {
    (experimental_useObject as jest.Mock).mockReturnValue({
      object: {
        recommendedMovies: [{ name: "Test Movie 1", releaseYear: "2023", synopsis: "Syn 1" }],
      },
      submit: mockSubmit,
      isLoading: true,
      error: undefined,
      clear: mockClear,
      stop: mockStop,
    });

    render(<Recommendations />);

    await waitFor(() => {
      expect(screen.getByTestId("stream-debugger")).toBeInTheDocument();
      expect(screen.getByText(/Movies parsed from stream so far: 1/)).toBeInTheDocument();
    });
  });

  it("uses cached poster on second navigation to the same movie", async () => {
    // Start with two movies; navigate to second and back to first to trigger POSTER_CACHE_HIT
    (experimental_useObject as jest.Mock).mockReturnValue({
      object: {
        recommendedMovies: [
          { name: "Cached Movie", releaseYear: "2000", synopsis: "Hit" },
          { name: "Second Movie", releaseYear: "2001", synopsis: "Miss" },
        ],
      },
      submit: mockSubmit,
      isLoading: false,
      error: undefined,
      clear: mockClear,
      stop: mockStop,
    });
    (searchMoviePoster as jest.Mock).mockResolvedValue("http://example.com/poster.jpg");

    render(<Recommendations />);

    // Wait for first poster to load
    await waitFor(() => {
      expect(screen.getByText("Cached Movie (2000)")).toBeInTheDocument();
    });

    // Navigate to second movie
    fireEvent.click(screen.getByText("Next Movie"));

    await waitFor(() => {
      expect(screen.getByText("Second Movie (2001)")).toBeInTheDocument();
    });

    // Navigate back to first — should hit the cache (POSTER_CACHE_HIT action)
    fireEvent.click(screen.getByText("Next Movie"));

    await waitFor(() => {
      expect(screen.getByText("Cached Movie (2000)")).toBeInTheDocument();
    });

    // searchMoviePoster should have been called only twice (once per unique movie name)
    expect(searchMoviePoster).toHaveBeenCalledTimes(2);
  });

  it("handles POSTER_FETCH_ERROR gracefully (shows no poster image)", async () => {
    (searchMoviePoster as jest.Mock).mockRejectedValue(new Error("TMDB unavailable"));
    jest.spyOn(console, "error").mockImplementation(() => {});

    render(<Recommendations />);

    await waitFor(() => {
      // No poster-loading spinner and no <img> because url is empty
      expect(screen.queryByTestId("poster-loading")).not.toBeInTheDocument();
    });
  });

  it("wraps back to the first movie when clicking Next on the last movie", async () => {
    (experimental_useObject as jest.Mock).mockReturnValue({
      object: {
        recommendedMovies: [
          { name: "Film A", releaseYear: "2001", synopsis: "Syn A" },
          { name: "Film B", releaseYear: "2002", synopsis: "Syn B" },
        ],
      },
      submit: mockSubmit,
      isLoading: false,
      error: undefined,
      clear: mockClear,
      stop: mockStop,
    });

    render(<Recommendations />);

    await waitFor(() => expect(screen.getByText("Film A (2001)")).toBeInTheDocument());

    // Go to last
    fireEvent.click(screen.getByText("Next Movie"));
    await waitFor(() => expect(screen.getByText("Film B (2002)")).toBeInTheDocument());

    // Wrap around
    fireEvent.click(screen.getByText("Next Movie"));
    await waitFor(() => expect(screen.getByText("Film A (2001)")).toBeInTheDocument());
  });

  it("waits for a settled streamed movie before fetching the poster", async () => {
    (experimental_useObject as jest.Mock).mockReturnValue({
      object: {
        recommendedMovies: [{ name: "Inc" }],
      },
      submit: mockSubmit,
      isLoading: true,
      error: undefined,
      clear: mockClear,
      stop: mockStop,
    });

    render(<Recommendations />);

    await waitFor(() => {
      expect(screen.getByText("Generating recommendations...")).toBeInTheDocument();
    });
    expect(searchMoviePoster).not.toHaveBeenCalled();
  });

  it("shows a no-results state when the stream finishes empty", async () => {
    (experimental_useObject as jest.Mock).mockReturnValue({
      object: { recommendedMovies: [] },
      submit: mockSubmit,
      isLoading: false,
      error: undefined,
      clear: mockClear,
      stop: mockStop,
    });

    render(<Recommendations />);

    await waitFor(() => {
      expect(screen.getByTestId("no-recommendations")).toBeInTheDocument();
      expect(screen.getByText("No strong matches this time")).toBeInTheDocument();
    });
  });

  it("clears the active stream and navigates home when Start Over is pressed", async () => {
    (experimental_useObject as jest.Mock).mockReturnValue({
      object: undefined,
      submit: mockSubmit,
      isLoading: true,
      error: undefined,
      clear: mockClear,
      stop: mockStop,
    });

    render(<Recommendations />);

    fireEvent.click(screen.getByText("Start Over"));

    expect(mockClear).toHaveBeenCalledTimes(1);
    expect(mockResetMovieSession).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/");
  });
});

// ---- Page default export ----
import RecommendationsPage from "./page";

describe("RecommendationsPage default export", () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn(), replace: jest.fn() });
    (useMovieContext as jest.Mock).mockReturnValue({
      participantsData: [],
      timeAvailable: "",
      resetMovieSession: jest.fn(),
    });
    (experimental_useObject as jest.Mock).mockReturnValue({
      object: undefined,
      submit: jest.fn(),
      isLoading: false,
      error: undefined,
      clear: jest.fn(),
      stop: jest.fn(),
    });
  });

  it("renders without crashing", () => {
    render(<RecommendationsPage />);
    // The page renders RecommendationsClient which triggers a redirect when no data,
    // but it should render (not throw)
  });
});
