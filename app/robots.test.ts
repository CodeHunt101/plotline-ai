import robots from "./robots";

describe("robots metadata", () => {
  it("allows public pages and blocks API routes", () => {
    expect(robots()).toEqual({
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/"],
      },
      sitemap: "https://plotline-ai.vercel.app/sitemap.xml",
      host: "https://plotline-ai.vercel.app",
    });
  });
});
