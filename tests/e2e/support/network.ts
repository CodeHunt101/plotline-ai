import type { Page } from "@playwright/test";
import {
  createRecommendationTextBody,
  recommendationFixtures,
  tmdbFixtures,
  type RecommendationFixture,
  type TmdbSearchResponse,
} from "../../support/movie-test-fixtures";

type StubMovieApisOptions = {
  recommendations?: RecommendationFixture;
  recommendationsStatus?: number;
  tmdbResponsesByQuery?: Record<string, TmdbSearchResponse>;
};

const ONE_PIXEL_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9sN0xG4AAAAASUVORK5CYII=",
  "base64"
);

export async function stubMovieApis(
  page: Page,
  {
    recommendations = recommendationFixtures.groupJourney,
    recommendationsStatus = 200,
    tmdbResponsesByQuery = tmdbFixtures.postersByQuery,
  }: StubMovieApisOptions = {}
) {
  await page.route("**/api/recommendations", async (route) => {
    if (recommendationsStatus >= 400) {
      await route.fulfill({
        status: recommendationsStatus,
        contentType: "text/plain; charset=utf-8",
        body: "Pipeline failed",
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "text/plain; charset=utf-8",
      body: createRecommendationTextBody(recommendations),
    });
  });

  await page.route("https://api.themoviedb.org/**", async (route) => {
    const requestUrl = new URL(route.request().url());
    const query = requestUrl.searchParams.get("query") ?? "";
    const body = tmdbResponsesByQuery[query] ?? tmdbFixtures.empty;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });

  await page.route("**/_next/image**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      body: ONE_PIXEL_PNG,
    });
  });

  await page.route("https://image.tmdb.org/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/png",
      body: ONE_PIXEL_PNG,
    });
  });
}
