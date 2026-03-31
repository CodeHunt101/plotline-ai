import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { MovieContext, MovieProvider } from "@/contexts/MovieContext";
import MovieForm from "./MovieFormClient";
import { metadata } from "./page";
import { ParticipantData } from "@/types/movie";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("movieForm page metadata", () => {
  it("exports route metadata", () => {
    expect(metadata.title).toBeTruthy();
    expect(metadata.description).toBeTruthy();
    expect(metadata.alternates?.canonical).toBe("/movieForm");
    expect(metadata.robots).toMatchObject({
      index: false,
      follow: true,
    });
  });
});

describe("MovieForm", () => {
  const mockRouter = { push: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
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

    const submitBtn = screen.getByRole("button", { name: /get movie/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText("Please fill out all required fields")).toBeInTheDocument();
  });

  it("navigates immediately on successful single-participant submission without calling API directly", async () => {
    renderMovieForm();

    const movieInput = screen.getByLabelText(/favourite movie/i);
    const personInput = screen.getByLabelText(/famous film person/i);

    fireEvent.change(movieInput, { target: { value: "The Matrix" } });
    fireEvent.change(personInput, { target: { value: "Keanu Reeves" } });

    const submitBtn = screen.getByRole("button", { name: /get movie/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith("/recommendations");
    });
  });

  it("advances to the next participant", async () => {
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
            resetMovieSession: jest.fn(),
          }}
        >
          <MovieForm />
        </MovieContext.Provider>
      </MovieProvider>
    );

    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();

    const movieInput = screen.getByLabelText(/favourite movie/i);
    const personInput = screen.getByLabelText(/famous film person/i);

    fireEvent.change(movieInput, { target: { value: "Interstellar" } });
    fireEvent.change(personInput, { target: { value: "Matt Damon" } });

    const submitBtn = screen.getByRole("button", { name: /next/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockSetParticipantsData).toHaveBeenCalled();
    });
  });

  it("handles movie type and mood type selection", () => {
    renderMovieForm();

    fireEvent.click(screen.getByText("Classic"));
    fireEvent.click(screen.getByText("Serious"));

    // Tabs are still rendered without error
    expect(screen.getByText("Classic")).toBeInTheDocument();
    expect(screen.getByText("Serious")).toBeInTheDocument();
  });

  it("clears form data after advancing to next participant", async () => {
    let internalParticipantsData: ParticipantData[] = [];
    const mockSetParticipantsData = jest.fn((data) => {
      internalParticipantsData = data;
    });

    render(
      <MovieProvider>
        <MovieContext.Provider
          value={{
            participantsData: internalParticipantsData,
            recommendations: null,
            timeAvailable: "",
            totalParticipants: 2,
            setParticipantsData: mockSetParticipantsData,
            setRecommendations: jest.fn(),
            setGroupTimeAvailable: jest.fn(),
            setTotalParticipants: jest.fn(),
            resetMovieSession: jest.fn(),
          }}
        >
          <MovieForm />
        </MovieContext.Provider>
      </MovieProvider>
    );

    const movieInput = screen.getByLabelText(/favourite movie/i) as HTMLTextAreaElement;
    const personInput = screen.getByLabelText(/famous film person/i);

    fireEvent.change(movieInput, { target: { value: "Inception" } });
    fireEvent.change(personInput, { target: { value: "Christopher Nolan" } });

    const submitBtn = screen.getByRole("button", { name: /next/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(movieInput.value).toBe("");
    });
  });
});

// ---- Page default export ----
import MovieFormPage from "./page";

describe("MovieFormPage default export", () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn() });
  });

  it("renders without crashing (wraps MovieFormClient in MovieProvider)", () => {
    render(
      <MovieProvider>
        <MovieFormPage />
      </MovieProvider>
    );
    expect(screen.getByText("Person #1")).toBeInTheDocument();
  });
});
