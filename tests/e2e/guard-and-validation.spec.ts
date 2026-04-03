import { expect, test } from "@playwright/test";

test.describe("Recommendation guardrails", () => {
  test("shows validation feedback when the movie form is submitted empty", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Start" }).click();

    await expect(page).toHaveURL(/\/movieForm$/);

    await page.getByRole("button", { name: "Get Movies" }).click();

    await expect(page.getByText("Please fill out all required fields")).toBeVisible();
    await expect(page.getByText("This field is required")).toHaveCount(2);
    await expect(page).toHaveURL(/\/movieForm$/);
  });

  test("redirects back home when recommendations are opened without session state", async ({
    page,
  }) => {
    await page.goto("/recommendations");

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button", { name: "Start" })).toBeVisible();
  });
});
