import { POST } from "./route";
import { generateText } from "ai";
import { NextResponse } from "next/server";

jest.mock("ai", () => ({
  generateText: jest.fn(),
}));

jest.mock("@/config/ai", () => ({
  getLanguageModel: jest.fn(() => "mock-model"),
}));

jest.mock("next/server", () => ({
  NextResponse: {
    json: jest.fn(),
  },
}));

describe("POST /api/movies", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns generated text as content on success", async () => {
    const mockMessages = [{ role: "user", content: "Suggest a film" }];
    const request = {
      json: jest.fn().mockResolvedValue({ messages: mockMessages }),
    } as unknown as Request;

    (generateText as jest.Mock).mockResolvedValue({ text: '{"recommendedMovies":[]}' });

    await POST(request);

    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "mock-model",
        messages: mockMessages,
        temperature: 0.65,
      })
    );
    expect(NextResponse.json).toHaveBeenCalledWith({
      content: '{"recommendedMovies":[]}',
    });
  });

  it("normalises fenced JSON content on success", async () => {
    const request = {
      json: jest.fn().mockResolvedValue({ messages: [] }),
    } as unknown as Request;

    (generateText as jest.Mock).mockResolvedValue({
      text: '```json\n{"recommendedMovies":[]}\n```',
    });

    await POST(request);

    expect(NextResponse.json).toHaveBeenCalledWith({
      content: '{"recommendedMovies":[]}',
    });
  });

  it("returns 500 when the model response is not valid JSON", async () => {
    const request = {
      json: jest.fn().mockResolvedValue({ messages: [] }),
    } as unknown as Request;

    (generateText as jest.Mock).mockResolvedValue({ text: "not valid json" });

    await POST(request);

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Movie recommendations response was not valid JSON" },
      { status: 500 }
    );
  });

  it("returns 500 error response when generateText throws an Error", async () => {
    const request = {
      json: jest.fn().mockResolvedValue({ messages: [] }),
    } as unknown as Request;

    (generateText as jest.Mock).mockRejectedValue(new Error("API failure"));

    await POST(request);

    expect(NextResponse.json).toHaveBeenCalledWith({ error: "API failure" }, { status: 500 });
  });

  it("returns 'Unknown error occurred' when a non-Error value is thrown", async () => {
    const request = {
      json: jest.fn().mockResolvedValue({ messages: [] }),
    } as unknown as Request;

    (generateText as jest.Mock).mockRejectedValue("string error");

    await POST(request);

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Unknown error occurred" },
      { status: 500 }
    );
  });
});
