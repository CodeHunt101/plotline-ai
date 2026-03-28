import { MovieRecommendation, MovieRecord } from "@/types/api";

type MovieRecommendationsResult = MovieRecommendation["result"];
type RecommendedMovie = MovieRecommendationsResult["recommendedMovies"][number];

const MAX_FALLBACK_RECOMMENDATIONS = 4;

export function emptyMovieRecommendations(): MovieRecommendationsResult {
  return { recommendedMovies: [] };
}

function hasRecommendedMovies(value: unknown): value is MovieRecommendationsResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return Array.isArray((value as { recommendedMovies?: unknown }).recommendedMovies);
}

function getJsonCandidates(raw: string): string[] {
  const trimmed = raw.trim();
  const candidates = [trimmed];

  const codeFenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (codeFenceMatch) {
    candidates.unshift(codeFenceMatch[1].trim());
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1).trim());
  }

  return [...new Set(candidates.filter(Boolean))];
}

export function parseMovieRecommendationsResponse(
  raw: string | null | undefined
): MovieRecommendationsResult {
  if (!raw?.trim()) {
    return emptyMovieRecommendations();
  }

  for (const candidate of getJsonCandidates(raw)) {
    try {
      const parsed = JSON.parse(candidate);

      if (hasRecommendedMovies(parsed)) {
        return parsed;
      }
    } catch {
      continue;
    }
  }

  throw new Error("Movie recommendations response was not valid JSON");
}

export function stringifyMovieRecommendationsResponse(raw: string | null | undefined): string {
  return JSON.stringify(parseMovieRecommendationsResponse(raw));
}

function parseFallbackMovie(match: Pick<MovieRecord, "content">): RecommendedMovie | null {
  const trimmed = match.content.trim();

  if (!trimmed) {
    return null;
  }

  const lineBreakParts = trimmed.split("\n");
  const header = lineBreakParts[0].trim();
  const synopsisFromLines = lineBreakParts.slice(1).join(" ").trim();

  const titleWithColonMatch = header.match(/^(.*?):\s*(\d{4})\s*\|/);
  if (titleWithColonMatch) {
    return {
      name: titleWithColonMatch[1].trim().replace(/^Movie \d+:\s*/, ""),
      releaseYear: titleWithColonMatch[2],
      synopsis: synopsisFromLines || trimmed,
    };
  }

  const titleWithDashMatch = trimmed.match(
    /^(?:Movie \d+:\s*)?(.+?)\s*\((\d{4})\)\s*-\s*([\s\S]+)$/
  );
  if (titleWithDashMatch) {
    return {
      name: titleWithDashMatch[1].trim(),
      releaseYear: titleWithDashMatch[2],
      synopsis: titleWithDashMatch[3].trim(),
    };
  }

  return {
    name: header.replace(/^Movie \d+:\s*/, ""),
    releaseYear: "",
    synopsis: synopsisFromLines || trimmed,
  };
}

export function fallbackMovieRecommendations(
  matches: Pick<MovieRecord, "content">[]
): MovieRecommendationsResult {
  const recommendedMovies = matches
    .map((match) => parseFallbackMovie(match))
    .filter((movie): movie is RecommendedMovie => movie !== null)
    .filter(
      (movie, index, movies) =>
        movies.findIndex(
          (candidate) =>
            candidate.name.toLowerCase() === movie.name.toLowerCase() &&
            candidate.releaseYear === movie.releaseYear
        ) === index
    )
    .slice(0, MAX_FALLBACK_RECOMMENDATIONS);

  return { recommendedMovies };
}
