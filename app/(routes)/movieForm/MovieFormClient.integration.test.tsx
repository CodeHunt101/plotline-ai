import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import MovieFormClient from "./MovieFormClient";
import { MovieProvider, useMovieContext } from "@/contexts/MovieContext";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

const mockPush = jest.fn();

function MovieFormSessionInitialiser({
  children,
  totalParticipants,
}: {
  children: React.ReactNode;
  totalParticipants: number;
}) {
  const { setParticipantsData, setTotalParticipants } = useMovieContext();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setParticipantsData([]);
    setTotalParticipants(totalParticipants);
    setIsReady(true);
  }, [setParticipantsData, setTotalParticipants, totalParticipants]);

  return isReady ? <>{children}</> : null;
}

function MovieContextSnapshot() {
  const { participantsData, totalParticipants } = useMovieContext();

  return (
    <>
      <output data-testid="participants-count">{participantsData.length}</output>
      <output data-testid="participants-json">{JSON.stringify(participantsData)}</output>
      <output data-testid="total-participants">{totalParticipants}</output>
    </>
  );
}

function renderMovieForm(totalParticipants = 2) {
  return render(
    <MovieProvider>
      <MovieFormSessionInitialiser totalParticipants={totalParticipants}>
        <MovieFormClient />
        <MovieContextSnapshot />
      </MovieFormSessionInitialiser>
    </MovieProvider>
  );
}

describe("MovieFormClient integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
  });

  it("accumulates participant data across steps, resets the form, and only navigates after the last participant", async () => {
    renderMovieForm(2);

    fireEvent.change(screen.getByLabelText(/what's your favourite movie and why/i), {
      target: { value: "I love practical action movies with huge set pieces." },
    });
    fireEvent.change(
      screen.getByLabelText(
        /which famous film person would you love to be stranded on an island with/i
      ),
      {
        target: { value: "George Miller" },
      }
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Person #2" })).toBeInTheDocument();
    });

    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByTestId("participants-count")).toHaveTextContent("1");
    expect(screen.getByTestId("participants-json")).toHaveTextContent(
      "I love practical action movies with huge set pieces."
    );
    expect(screen.getByTestId("total-participants")).toHaveTextContent("2");
    expect(screen.getByLabelText(/what's your favourite movie and why/i)).toHaveValue("");
    expect(
      screen.getByLabelText(
        /which famous film person would you love to be stranded on an island with/i
      )
    ).toHaveValue("");

    fireEvent.change(screen.getByLabelText(/what's your favourite movie and why/i), {
      target: { value: "I want something cosy and funny for the second pick." },
    });
    fireEvent.change(
      screen.getByLabelText(
        /which famous film person would you love to be stranded on an island with/i
      ),
      {
        target: { value: "Olivia Colman" },
      }
    );

    fireEvent.click(screen.getByRole("button", { name: "Get Movie" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/recommendations");
    });

    expect(screen.getByTestId("participants-count")).toHaveTextContent("2");
    expect(screen.getByTestId("participants-json")).toHaveTextContent(
      "I love practical action movies with huge set pieces."
    );
    expect(screen.getByTestId("participants-json")).toHaveTextContent(
      "I want something cosy and funny for the second pick."
    );
  });
});
