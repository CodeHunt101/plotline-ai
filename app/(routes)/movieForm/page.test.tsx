import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { MovieContext, MovieProvider } from "@/contexts/MovieContext";
import MovieForm from "./page";
import { ParticipantData } from "@/types/movie";
import { getMovieRecommendations } from "@/services/movies";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/services/movies", () => ({
  getMovieRecommendations: jest.fn(),
}));

// Mock useActionState so the real handleFormSubmission callback is invoked
const mockSubmitAction = jest.fn();

jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useActionState: (fn: (prevState: unknown, formData: FormData) => Promise<unknown>) => {
    mockSubmitAction.mockImplementation((formData: FormData) => fn(undefined, formData));
    return [null, mockSubmitAction, false];
  },
  useState: jest.requireActual("react").useState,
}));

describe("MovieForm", () => {
  const mockRouter = { push: jest.fn() };

  const mockRecommendation = {
    match: [],
    result: {
      recommendedMovies: [{ name: "Test Movie", releaseYear: "2024", synopsis: "A test movie" }],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (getMovieRecommendations as jest.Mock).mockResolvedValue(mockRecommendation);
  });

  const renderMovieForm = () =>
    render(
      <MovieProvider>
        <MovieForm />
      </MovieProvider>
    );

  it("renders the form with initial state", () => {
    renderMovieForm();
    expect(screen.getByText("Person #1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /get movie/i })).toBeInTheDocument();
  });

  it("returns a validation error message when required fields are empty", async () => {
    renderMovieForm();

    const formData = new FormData();
    formData.append("favouriteMovie", "");
    formData.append("favouriteFilmPerson", "");

    const result = await mockSubmitAction(formData);

    expect(result).toBe("Please fill out all required fields");
  });

  it("calls getMovieRecommendations and navigates on successful single-participant submission", async () => {
    renderMovieForm();

    const formData = new FormData();
    formData.append("favouriteMovie", "The Matrix");
    formData.append("favouriteFilmPerson", "Keanu Reeves");

    await mockSubmitAction(formData);

    expect(getMovieRecommendations).toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalledWith("/recommendations");
  });

  it("advances to the next participant without calling getMovieRecommendations", async () => {
    const participantsData: ParticipantData[] = [];
    const mockSetParticipantsData = jest.fn();

    render(
      <MovieProvider>
        <MovieContext.Provider
          value={{
            participantsData,
            recommendations: null,
            timeAvailable: "",
            totalParticipants: 2,
            setParticipantsData: mockSetParticipantsData,
            setRecommendations: jest.fn(),
            setGroupTimeAvailable: jest.fn(),
            setTotalParticipants: jest.fn(),
          }}
        >
          <MovieForm />
        </MovieContext.Provider>
      </MovieProvider>
    );

    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();

    const formData = new FormData();
    formData.append("favouriteMovie", "Interstellar");
    formData.append("favouriteFilmPerson", "Matt Damon");

    await mockSubmitAction(formData);

    expect(getMovieRecommendations).not.toHaveBeenCalled();
    expect(mockSetParticipantsData).toHaveBeenCalled();
  });

  it("returns the API error message when getMovieRecommendations throws an Error", async () => {
    (getMovieRecommendations as jest.Mock).mockRejectedValue(new Error("API Error"));
    renderMovieForm();

    const formData = new FormData();
    formData.append("favouriteMovie", "The Matrix");
    formData.append("favouriteFilmPerson", "Keanu Reeves");

    const result = await mockSubmitAction(formData);

    expect(result).toBe("API Error");
  });

  it("returns a generic error message when a non-Error is thrown", async () => {
    (getMovieRecommendations as jest.Mock).mockRejectedValue("unexpected");
    renderMovieForm();

    const formData = new FormData();
    formData.append("favouriteMovie", "The Matrix");
    formData.append("favouriteFilmPerson", "Keanu Reeves");

    const result = await mockSubmitAction(formData);

    expect(result).toBe("An unexpected error occurred");
  });

  it("handles movie type and mood type selection", () => {
    renderMovieForm();

    fireEvent.click(screen.getByText("Classic"));
    fireEvent.click(screen.getByText("Serious"));

    // Tabs are still rendered without error
    expect(screen.getByText("Classic")).toBeInTheDocument();
    expect(screen.getByText("Serious")).toBeInTheDocument();
  });

  it("shows the loading state when isPending is true", () => {
    // Override the mock for this test to set isPending = true
    jest
      .spyOn(require("react"), "useActionState")
      .mockReturnValueOnce([null, mockSubmitAction, true]);

    renderMovieForm();

    expect(screen.getByText("Loading movies...")).toBeInTheDocument();
    expect(screen.queryByText("Person #1")).not.toBeInTheDocument();
  });

  it("displays the error returned by the action", () => {
    // Override the mock for this test to inject an error string
    jest
      .spyOn(require("react"), "useActionState")
      .mockReturnValueOnce(["Please fill out all required fields", mockSubmitAction, false]);

    renderMovieForm();

    expect(screen.getByText("Please fill out all required fields")).toBeInTheDocument();
  });

  it("clears form data after advancing to next participant", async () => {
    const mockSetParticipantsData = jest.fn();

    render(
      <MovieProvider>
        <MovieContext.Provider
          value={{
            participantsData: [],
            recommendations: null,
            timeAvailable: "",
            totalParticipants: 2,
            setParticipantsData: mockSetParticipantsData,
            setRecommendations: jest.fn(),
            setGroupTimeAvailable: jest.fn(),
            setTotalParticipants: jest.fn(),
          }}
        >
          <MovieForm />
        </MovieContext.Provider>
      </MovieProvider>
    );

    const formData = new FormData();
    formData.append("favouriteMovie", "Inception");
    formData.append("favouriteFilmPerson", "Christopher Nolan");

    await mockSubmitAction(formData);

    await waitFor(() => {
      const movieInput = screen.getByLabelText(/favourite movie/i) as HTMLTextAreaElement;
      expect(movieInput.value).toBe("");
    });
  });
});
