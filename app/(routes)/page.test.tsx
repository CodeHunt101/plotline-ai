import { render, screen } from "@testing-library/react"
import { initialiseEmbeddingsStorage } from "@/lib/services/embeddings"
import MovieNightForm from "./page"

jest.mock("@/components/features/ParticipantsSetup", () => jest.fn(() => <div>Participants Setup</div>))
jest.mock("@/lib/services/embeddings", () => ({
  initialiseEmbeddingsStorage: jest.fn()
}))
jest.mock("next/headers", () => ({
  headers: jest.fn()
}))

describe("MovieNightForm Component", () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it("renders ParticipantsSetup when initialisation is successful", async () => {
    (initialiseEmbeddingsStorage as jest.Mock).mockResolvedValueOnce(undefined)

    render(await MovieNightForm())

    expect(screen.getByText("Participants Setup")).toBeInTheDocument()
    expect(initialiseEmbeddingsStorage).toHaveBeenCalledWith(expect.any(Function))
  })

  it("renders error message when initialisation fails", async () => {
    (initialiseEmbeddingsStorage as jest.Mock).mockRejectedValueOnce(new Error("Failed to initialise"))

    render(await MovieNightForm())

    expect(screen.getByText("Failed to initialise. Please try again later.")).toBeInTheDocument()
    expect(initialiseEmbeddingsStorage).toHaveBeenCalled()
  })

  it("logs error to console when initialisation fails", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {})
    const error: Error = new Error("Initialisation error");
    (initialiseEmbeddingsStorage as jest.Mock).mockRejectedValueOnce(error)

    render(await MovieNightForm())

    expect(consoleSpy).toHaveBeenCalledWith(error)
    consoleSpy.mockRestore()
  })
})
