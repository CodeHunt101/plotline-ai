# Repository Guidelines

## Project Structure & Module Organisation

`app/` holds the Next.js App Router: UI routes live in `app/(routes)/`, and server handlers live in `app/api/`. Put feature UI in `components/features/`, reusable primitives in `components/ui/`, and shared state in `contexts/`. API/data logic belongs in `lib/services/`, config in `lib/config/`, and utilities in `lib/utils/`. Cloudflare workers live in `workers/` with config in `wrangler.openai.toml` and `wrangler.supabase.toml`. Tests are colocated as `*.test.ts` or `*.test.tsx`. Assets live in `public/`, shared data in `constants/`, and types in `types/`.

## Build, Test, and Development Commands

Use `pnpm`.

- `pnpm install`: install dependencies.
- `pnpm dev`: start the Next.js app on `http://localhost:3000`.
- `pnpm build`: create a production build.
- `pnpm start`: serve the production build locally.
- `pnpm lint`: run ESLint with the Next.js ruleset.
- `pnpm test`: run Jest in watch mode.
- `pnpm test:ci`: run the Jest suite once for CI-style verification.
- `pnpm test:coverage`: run Jest with coverage collection and enforce the 50% threshold.
- `npx wrangler dev --config wrangler.openai.toml`: run the OpenAI worker.
- `npx wrangler dev --config wrangler.supabase.toml`: run the Supabase worker.

## Coding Style & Naming Conventions

TypeScript is `strict`, so prefer explicit types for props, service inputs, and return values. Follow the existing React style: functional components, hooks prefixed with `use`, PascalCase components, and camelCase helpers/services. Use the `@/` aliases from `tsconfig.json` for cross-folder imports. Match the surrounding file’s formatting; the codebase mostly uses compact files and 2-space indentation. Linting comes from `next/core-web-vitals` and `next/typescript`. Use Australian English spellings throughout all code, comments, and documentation.

## Testing Guidelines

Jest and React Testing Library are the default tools. Keep tests beside the code they cover and name them `Component.test.tsx`, `service.test.ts`, or similar. Mock network calls in service tests and assert rendered behaviour in route and component tests. Coverage is enforced at 50% globally (branches, functions, lines, statements). After implementing a feature or making any code change, run `pnpm test:ci` to verify tests pass and `pnpm test:coverage` to verify coverage thresholds are met. Add or update tests for every bug fix and behaviour change.

## Commit & Pull Request Guidelines

Recent history favours short, imperative commit subjects such as `improve prompt`, with optional prefixes like `refactor:` for scoped cleanup. Keep each commit focused on one logical change. Pull requests should summarise behaviour changes, note env or worker config updates, link the relevant issue when available, and include screenshots for UI changes. Before opening a PR, run `pnpm lint` and `pnpm test:ci` and mention anything you could not verify.

## Environment & Configuration Tips

Store app variables in `.env.local` and worker secrets in `.dev.vars`; never commit either file. `NEXT_PUBLIC_OPENAI_WORKER_URL` and `NEXT_PUBLIC_SUPABASE_WORKER_URL` default to `http://localhost:8787` and `http://localhost:7878`, so keep local Wrangler ports aligned.
