import { getUserCountry } from "./geolocation";

const CACHE_KEY = "user_country_code";
const originalFetch = global.fetch;
let mockStorage: Record<string, string> = {};

beforeEach(() => {
  mockStorage = {};
  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: jest.fn((key) => mockStorage[key] || null),
      setItem: jest.fn((key, value) => {
        mockStorage[key] = value.toString();
      }),
      clear: jest.fn(() => {
        mockStorage = {};
      }),
    },
    writable: true,
  });
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe("getUserCountry", () => {
  it("should return the country code from localStorage if available", async () => {
    mockStorage[CACHE_KEY] = "NZ";
    global.fetch = jest.fn(); // Ensure fetch is not called

    const result = await getUserCountry();
    expect(result).toBe("NZ");
    expect(global.fetch).not.toHaveBeenCalled();
    expect(window.localStorage.getItem).toHaveBeenCalledWith(CACHE_KEY);
  });

  it("should fetch country from api.country.is and save to localStorage on success", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ ip: "1.1.1.1", country: "US" }),
    });

    const result = await getUserCountry();

    expect(result).toBe("US");
    expect(global.fetch).toHaveBeenCalledWith("https://api.country.is/");
    expect(window.localStorage.setItem).toHaveBeenCalledWith(CACHE_KEY, "US");
  });

  it("should fallback to AU on API failure", async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error("Network error")));
    // Spying console.error to keep logs clean
    jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await getUserCountry();
    expect(result).toBe("AU");
  });

  it("should ignore localStorage errors and fallback to AU if API fails", async () => {
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: () => {
          throw new Error("Access denied");
        },
        setItem: () => {
          throw new Error("Access denied");
        },
      },
      writable: true,
    });
    global.fetch = jest.fn(() => Promise.reject(new Error("Network error")));
    jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await getUserCountry();
    expect(result).toBe("AU");
  });

  it("should fallback to AU if API response format is unsupported", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ not_country: "US" }),
    });

    const result = await getUserCountry();
    expect(result).toBe("AU");
  });

  it("should fallback to AU when the country value is not a string", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ country: 61 }),
    });

    const result = await getUserCountry();
    expect(result).toBe("AU");
  });

  it("should fallback to AU when the country code is not exactly two characters", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ country: "AUS" }),
    });

    const result = await getUserCountry();
    expect(result).toBe("AU");
  });

  it("should fallback to AU when the country API returns a non-ok status", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn(),
    });
    jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await getUserCountry();
    expect(result).toBe("AU");
  });
});
