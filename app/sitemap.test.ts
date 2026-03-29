import sitemap from "./sitemap";

describe("sitemap metadata", () => {
  it("includes only the indexable landing page", () => {
    const entries = sitemap();

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      url: "https://plotline-ai.vercel.app",
      changeFrequency: "monthly",
      priority: 1,
    });
    expect(entries[0]?.lastModified).toBeInstanceOf(Date);
  });
});
