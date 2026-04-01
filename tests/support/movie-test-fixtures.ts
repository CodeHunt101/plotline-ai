export const recommendationFixtures = {
  groupJourney: {
    recommendedMovies: [
      {
        name: "Mad Max: Fury Road",
        releaseYear: "2015",
        synopsis: "A relentless desert chase with furious stunts and a huge heart.",
      },
      {
        name: "Paddington 2",
        releaseYear: "2017",
        synopsis: "Paddington brings warmth, chaos, and kindness to a city mystery.",
      },
    ],
  },
  empty: {
    recommendedMovies: [],
  },
} as const;

export type RecommendationFixture =
  (typeof recommendationFixtures)[keyof typeof recommendationFixtures];

export function createTmdbSearchResponse(posterPath?: string) {
  return {
    results: posterPath ? [{ poster_path: posterPath }] : [],
  };
}

export const tmdbFixtures = {
  postersByQuery: {
    "Mad Max: Fury Road": createTmdbSearchResponse("/mad-max-fury-road.jpg"),
    "Paddington 2": createTmdbSearchResponse("/paddington-2.jpg"),
  },
  empty: createTmdbSearchResponse(),
} as const;

export type TmdbSearchResponse = ReturnType<typeof createTmdbSearchResponse>;

function createTextStream(text: string, chunkSize = text.length): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      for (let index = 0; index < text.length; index += chunkSize) {
        controller.enqueue(encoder.encode(text.slice(index, index + chunkSize)));
      }

      controller.close();
    },
  });
}

export function createRecommendationTextBody(
  payload: RecommendationFixture = recommendationFixtures.groupJourney
): string {
  return JSON.stringify(payload);
}

export function createTextStreamResponse(text: string, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  const status = init.status ?? 200;

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "text/plain; charset=utf-8");
  }

  return {
    ok: status >= 200 && status < 300,
    status,
    headers,
    body: createTextStream(text),
    text: async () => text,
    json: async () => JSON.parse(text),
  } as Response;
}

export function createJsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  const text = JSON.stringify(payload);
  const headers = new Headers(init.headers);
  const status = init.status ?? 200;

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return {
    ok: status >= 200 && status < 300,
    status,
    headers,
    body: createTextStream(text),
    text: async () => text,
    json: async () => payload,
  } as Response;
}

export function createRecommendationStreamResponse(
  payload: RecommendationFixture = recommendationFixtures.groupJourney,
  init: ResponseInit = {}
): Response {
  return createTextStreamResponse(createRecommendationTextBody(payload), init);
}
