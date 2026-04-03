const CACHE_KEY = "user_country_code";
/**
 * Fetches the user's country code based on their IP address using api.country.is.
 * Values are cached in local storage to prevent rate limits and repeated network calls.
 * Returns `null` when the user's country cannot be determined.
 */
export async function getUserCountry(): Promise<string | null> {
  // Check local storage primarily
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      return cached;
    }
  } catch {
    // Ignore localStorage errors (e.g., incognito mode)
  }

  try {
    const response = await fetch("https://api.country.is/");
    if (!response.ok) {
      throw new Error(`Country API responded with ${response.status}`);
    }
    const data = await response.json();

    if (data && data.country && typeof data.country === "string" && data.country.length === 2) {
      const countryCode = data.country.toUpperCase();

      try {
        localStorage.setItem(CACHE_KEY, countryCode);
      } catch {
        // Ignore localStorage errors
      }

      return countryCode;
    }
  } catch (error) {
    console.error("Failed to determine user country:", error);
  }

  return null;
}
