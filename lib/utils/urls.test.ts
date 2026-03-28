import { getBaseUrl, createFullUrl } from "./urls";

/** `process.env.NODE_ENV` is readonly in typings; tests need to override it. */
function setNodeEnv(value: string | undefined): void {
  (process.env as Record<string, string | undefined>).NODE_ENV = value;
}

describe("getBaseUrl", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    setNodeEnv(originalNodeEnv);
  });

  const makeHeaders = (host: string) =>
    ({ get: (key: string) => (key === "host" ? host : null) }) as unknown as Headers;

  it("returns http URL for production with localhost host", () => {
    setNodeEnv("production");
    expect(getBaseUrl(makeHeaders("localhost:3000"))).toBe("http://localhost:3000");
  });

  it("returns http URL for development environment", () => {
    setNodeEnv("development");
    expect(getBaseUrl(makeHeaders("localhost:3000"))).toBe("http://localhost:3000");
  });

  it("returns https URL for production with non-localhost host", () => {
    setNodeEnv("production");
    expect(getBaseUrl(makeHeaders("plotline-ai.vercel.app"))).toBe(
      "https://plotline-ai.vercel.app"
    );
  });

  it("returns https URL for test environment (default branch)", () => {
    setNodeEnv("test");
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
