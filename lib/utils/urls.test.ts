import { getBaseUrl, createFullUrl } from "./urls";

describe("getBaseUrl", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  const makeHeaders = (host: string) =>
    ({ get: (key: string) => (key === "host" ? host : null) }) as unknown as Headers;

  it("returns http URL for production with localhost host", () => {
    process.env.NODE_ENV = "production";
    expect(getBaseUrl(makeHeaders("localhost:3000"))).toBe("http://localhost:3000");
  });

  it("returns http URL for development environment", () => {
    process.env.NODE_ENV = "development";
    expect(getBaseUrl(makeHeaders("localhost:3000"))).toBe("http://localhost:3000");
  });

  it("returns https URL for production with non-localhost host", () => {
    process.env.NODE_ENV = "production";
    expect(getBaseUrl(makeHeaders("plotline-ai.vercel.app"))).toBe(
      "https://plotline-ai.vercel.app"
    );
  });

  it("returns https URL for test environment (default branch)", () => {
    process.env.NODE_ENV = "test";
    expect(getBaseUrl(makeHeaders("example.com"))).toBe("https://example.com");
  });
});

describe("createFullUrl", () => {
  it("returns base URL when no path provided", () => {
    expect(createFullUrl("https://example.com")).toBe("https://example.com");
  });

  it("appends path to base URL when path is provided", () => {
    expect(createFullUrl("https://example.com", "/api/test")).toBe("https://example.com/api/test");
  });
});
