describe("supabase config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.SUPABASE_WORKER_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_WORKER_URL;
    delete process.env.SUPABASE_WORKER_SECRET;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("falls back to the local worker URL and omits the secret header by default", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const config = require("./supabase");

    expect(config.SUPABASE_WORKER_URL).toBe("http://localhost:7878");
    expect(config.getSupabaseWorkerHeaders({ "Content-Type": "application/json" })).toEqual({
      "Content-Type": "application/json",
    });
  });

  it("prefers the server-only worker URL and includes the shared secret header", () => {
    process.env.SUPABASE_WORKER_URL = "https://worker.example.com";
    process.env.SUPABASE_WORKER_SECRET = "super-secret";

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const config = require("./supabase");

    expect(config.SUPABASE_WORKER_URL).toBe("https://worker.example.com");
    expect(config.getSupabaseWorkerHeaders()).toEqual({
      "x-worker-secret": "super-secret",
    });
  });
});
