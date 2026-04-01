import { expect, test } from "@playwright/test";
import { stubMovieApis } from "./support/network";

test.describe("Core recommendation journey", () => {
  test("takes a two-person group from setup to recommendations and back home", async ({ page }) => {
    await stubMovieApis(page);

    await page.goto("/");

    const participantsSlider = page.getByRole("slider", { name: "How many people?" });
    await participantsSlider.focus();
    await participantsSlider.press("ArrowRight");

    await page.getByLabel("How much time do you have?").fill("2 hours");
    await page.getByRole("button", { name: "Start" }).click();

    await expect(page).toHaveURL(/\/movieForm$/);
    await expect(page.getByRole("heading", { name: "Person #1" })).toBeVisible();

    await page
      .getByLabel(/what's your favourite movie and why/i)
      .fill("I love practical action movies with huge set pieces and momentum.");
    await page.getByRole("tab", { name: "Classic" }).click();
    await page.getByRole("tab", { name: "Serious" }).click();
    await page
      .getByLabel(/which famous film person would you love to be stranded on an island with/i)
      .fill("George Miller for the stories.");
    await page.getByRole("button", { name: /^Next$/ }).click();

    await expect(page.getByRole("heading", { name: "Person #2" })).toBeVisible();
    await expect(page.getByLabel(/what's your favourite movie and why/i)).toHaveValue("");

    await page
      .getByLabel(/what's your favourite movie and why/i)
      .fill("I want something warm, funny, and comforting for a relaxed night.");
    await page
      .getByLabel(/which famous film person would you love to be stranded on an island with/i)
      .fill("Paddington, obviously.");

    const recommendationsRequest = page.waitForRequest("**/api/recommendations");
    const recommendationsResponse = page.waitForResponse("**/api/recommendations");
    await page.getByRole("button", { name: "Get Movie" }).click();

    await expect(page).toHaveURL(/\/recommendations$/);
    await recommendationsRequest;
    await recommendationsResponse;
    await expect(page.getByRole("heading", { name: "Mad Max: Fury Road (2015)" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("img", { name: "Mad Max: Fury Road" })).toBeVisible();

    await page.getByRole("button", { name: "Next Movie" }).click();
    await expect(page.getByRole("heading", { name: "Paddington 2 (2017)" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Paddington 2" })).toBeVisible();

    await page.getByRole("button", { name: "Start Over" }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
    await expect(page.getByLabel("How much time do you have?")).toHaveValue("");
  });
});
