# PlotlineAI

PlotlineAI is a group movie recommendation app. Each participant shares their tastes -- favourite film, preferred era, current mood, and a favourite film personality -- and the system uses **embedding-based vector search** combined with a **language model** to surface movies the whole group will enjoy.

[![Live Demo](https://img.shields.io/badge/demo-plotline--ai-blue)](https://plotline-ai.vercel.app/)

## How It Works

The recommendation pipeline has three stages: **embed**, **retrieve**, and **rank**.

```
Participants' preferences
        |
        v
  +-----------+       +-----------------+       +------------------+
  |  Embed    | ----> |  Vector Search  | ----> |  LLM Re-ranking  |
  | (AI SDK)  |       | (Supabase +     |       | (Gemini / Open-  |
  |           |       |  pgvector)      |       |  Router)         |
  +-----------+       +-----------------+       +------------------+
                                                        |
                                                        v
                                                 Recommended movies
                                                 + TMDB posters
```

### 1. Collect preferences

Each participant fills in:

- A **favourite movie** and why they love it
- **New vs classic** preference (2015-present or pre-2015)
- **Mood** (fun, serious, inspiring, or scary)
- A **favourite film person** they would want to be stranded on an island with

The group also sets how much **time** is available for the session.

### 2. Embed

All preferences are concatenated into a single text blob and sent to `POST /api/embeddings`. The server calls an embedding model (OpenRouter model or Google Gemini) via the Vercel AI SDK. The returned vector is **L2-normalised** on the client before the next step.

### 3. Retrieve -- vector similarity search

The normalised vector is forwarded to the **Supabase Cloudflare Worker** (`POST /api/match-movies`), which runs the Postgres RPC `match_movies_4`. This function uses the pgvector `<=>` (cosine distance) operator against a pre-seeded corpus of movie embeddings and returns the **top 10 matches** above a 0.25 similarity threshold.

The movie corpus lives in `public/constants/movies.txt` and is chunked and embedded via the `/api/embeddings-seed` endpoint on first run.

### 4. Rank -- language model re-ranking

The matched movie content is split into individual entries and formatted as a "Movie List Context". This context, together with the original participant preferences, is sent to `POST /api/movies`, which calls a language model (Gemini 2.5 Flash by default, or a model via OpenRouter) through the Cloudflare AI Gateway.

A structured system prompt instructs the model to return between 1 and 10 movies as JSON, filtered by time constraints, era preference, mood, and genre fit.

### 5. Fallback and display

If the LLM response cannot be parsed as valid JSON, a **heuristic fallback** (`lib/utils/recommendations.ts`) extracts movie titles, years, and synopses directly from the raw vector-match text. Movie posters are fetched from the **TMDB API** and displayed in a carousel.

## Tech Stack

| Layer       | Technology                                                |
| ----------- | --------------------------------------------------------- |
| Framework   | Next.js 16 (App Router, Turbopack)                        |
| UI          | React 19, Tailwind CSS, DaisyUI                           |
| AI          | Vercel AI SDK, Google Gemini, OpenRouter                  |
| Gateway     | Cloudflare AI Gateway                                     |
| Database    | Supabase (Postgres + pgvector)                            |
| Edge worker | Cloudflare Workers                                        |
| Testing     | Jest 29, React Testing Library                            |
| Tooling     | TypeScript (strict), ESLint, Prettier, Husky, lint-staged |

## Getting Started

### Prerequisites

- Node.js v22.13.1 or higher
- pnpm
- A Supabase project with the pgvector extension enabled
- API keys for your chosen AI provider (Google or OpenRouter) and TMDB
- (Optional) A Cloudflare account for the AI Gateway

### Install

```bash
git clone https://github.com/CodeHunt101/plotline-ai.git
cd plotline-ai
pnpm install
```

### Environment variables

Create **`.env.local`** for the Next.js app:

```env
# AI providers: "openrouter" or "google"
AI_TEXT_PROVIDER=google
AI_EMBEDDING_PROVIDER=google

# Google Gemini
GOOGLE_GENERATIVE_AI_API_KEY=

# OpenRouter (only needed when AI_TEXT_PROVIDER or AI_EMBEDDING_PROVIDER is "openrouter")
OPENROUTER_API_KEY=
OPENROUTER_EMBEDDING_MODEL=            # optional, defaults to nvidia/llama-nemotron-embed-vl-1b-v2:free

# Cloudflare AI Gateway (required for Google provider path)
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_GATEWAY_NAME=
CLOUDFLARE_API_KEY=                    # optional

# Supabase worker URL (defaults to http://localhost:7878)
NEXT_PUBLIC_SUPABASE_WORKER_URL=

# TMDB poster lookup
NEXT_PUBLIC_TMBD_ACCESS_TOKEN=
```

Create **`.dev.vars`** for the Cloudflare Supabase worker (see `.dev.vars.example`):

```env
SUPABASE_URL=
SUPABASE_API_KEY=
```

### Database setup

Enable the pgvector extension and create the movies table. The vector dimension must match your embedding provider -- **768** for Google Gemini (default), **1536** for OpenAI-compatible models.

```sql
create extension vector;

create table movies_4 (
  id bigserial primary key,
  content text,
  embedding vector(768)
);

create function match_movies_4(
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  content text,
  similarity float
)
language sql stable
as $$
  select
    id,
    content,
    1 - (movies_4.embedding <=> query_embedding) as similarity
  from movies_4
  where 1 - (movies_4.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
```

### Development

Start the Next.js dev server and the Supabase worker:

```bash
pnpm dev
npx wrangler dev --config wrangler.supabase.toml
```

Then open [http://localhost:3000](http://localhost:3000).

To seed the movie corpus into Supabase on first run, visit `/api/embeddings-seed` or call `GET /api/embeddings-seed` directly. This chunks `public/constants/movies.txt`, embeds each chunk, and inserts them into the `movies_4` table if it is empty.

### Testing

```bash
pnpm test              # watch mode
pnpm test:ci           # single run (CI)
pnpm test:coverage     # coverage report -- 95% threshold enforced
```

### Deployment

Deploy the Next.js app to Vercel:

```bash
vercel
```

Deploy the Supabase worker to Cloudflare:

```bash
npx wrangler deploy --config wrangler.supabase.toml
```

### Supabase keepalive

This repo includes a GitHub Actions workflow at `.github/workflows/supabase-keepalive.yml` that runs a lightweight Postgres query once per day.

To enable it:

1. In GitHub, open **Settings -> Secrets and variables -> Actions**.
2. Add a repository secret named `SUPABASE_DB_URL`.
3. Paste your Supabase **transaction pooler** connection string from **Connect -> Transaction mode** in the Supabase dashboard.

The workflow also supports manual runs from the **Actions** tab via `workflow_dispatch`.

## Project Structure

```
plotline-ai/
├── app/
│   ├── (routes)/                 # UI pages
│   │   ├── page.tsx                # Home -- participant setup
│   │   ├── movieForm/page.tsx      # Per-person preference form
│   │   └── recommendations/page.tsx# Results carousel
│   ├── api/
│   │   ├── movies/route.ts         # LLM chat completion
│   │   ├── embeddings/route.ts     # Embedding generation
│   │   └── embeddings-seed/route.ts# Corpus seeding
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── features/                 # Header, Logo, ParticipantsSetup, MovieFormFields
│   └── ui/                       # TextAreaField, TabGroup
├── contexts/                     # MovieContext (shared state)
├── constants/                    # MOVIE_TYPES, MOOD_TYPES, sample data
├── types/                        # TypeScript interfaces (api.ts, movie.ts)
├── lib/
│   ├── config/                   # ai.ts (model selection), supabase.ts
│   ├── services/                 # movies, embeddings, openai, supabase, seed, tmdb
│   └── utils/                    # recommendations.ts, urls.ts
├── workers/
│   └── supabase-worker.ts        # Cloudflare Worker for Supabase operations
├── public/
│   └── constants/movies.txt      # Movie corpus for embedding seeding
├── wrangler.supabase.toml
├── jest.config.js
├── tailwind.config.ts
└── package.json
```

## Cloudflare Workers

### Supabase Worker

The Supabase worker (`workers/supabase-worker.ts`, port 7878) proxies database operations so that Supabase credentials stay server-side:

- `POST /api/insert-movies` -- batch-insert chunked movie data during seeding.
- `GET /api/check-empty` -- check whether the movies table needs seeding.
- `POST /api/match-movies` -- run the pgvector similarity RPC and return the top matches.

### AI Gateway

AI model calls (both embedding and chat) are routed through the **Cloudflare AI Gateway** for logging, caching, rate limiting, and provider failover. The gateway is configured in `lib/config/ai.ts` using the `ai-gateway-provider` package.

## AI Limitations

PlotlineAI uses artificial intelligence for movie recommendations, and while it strives for accuracy:

- Recommendations may not always perfectly match group preferences.
- Movie information and details might occasionally be incomplete or imprecise.
- The system works best with clear, detailed input from all participants.
- Results can vary based on the quality and specificity of user inputs.
