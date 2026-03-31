# PlotlineAI — Architecture Diagrams

## 1. System Architecture

High-level view of all layers: browser, Next.js, services, and external APIs.

```mermaid
graph TD
    Browser["Browser\n(React + MovieContext)"]

    subgraph NextJS["Next.js App"]
        Pages["Pages\n/  /movieForm  /recommendations"]
        API_Rec["POST /api/recommendations"]
        API_Mov["POST /api/movies"]
        API_Seed["GET /api/embeddings-seed"]

        subgraph Services["lib/services/"]
            SvcRec["movie-recommendations\n(pipeline orchestrator)"]
            SvcEmb["embeddings-server\n(Google Gemini embed)"]
            SvcOAI["openai\n(LLM interface)"]
            SvcSup["supabase\n(worker proxy)"]
            SvcTMDB["tmdb\n(poster lookup)"]
            SvcSeed["seed\n(corpus seeding)"]
        end
    end

    subgraph CloudflareEdge["Cloudflare Edge"]
        AIGateway["AI Gateway\n(logging / caching)"]
        Worker["Supabase CF Worker\n/api/match-movies\n/api/insert-movies\n/api/truncate-movies\n/api/check-empty"]
    end

    subgraph ExternalAPIs["External APIs"]
        Gemini["Google Gemini\ngemini-embedding-001\ngemini-2.5-flash"]
        OpenRouter["OpenRouter\nminimax-m2.5\nllama-3.3-70b\nopenrouter/free"]
        SupabaseDB["Supabase Postgres\nmovies_4 + pgvector\nmatch_movies_4 RPC"]
        TMDB["TMDB API\nmovie posters"]
    end

    Browser -->|"form submit / navigate"| Pages
    Pages -->|"fetch"| API_Rec
    API_Rec --> SvcRec
    SvcRec --> SvcEmb
    SvcRec --> SvcSup
    SvcRec --> SvcOAI
    API_Mov --> SvcOAI
    API_Seed --> SvcSeed
    SvcSeed --> SvcEmb

    SvcEmb -->|"embed request"| AIGateway
    SvcOAI -->|"LLM request (primary)"| AIGateway
    AIGateway --> Gemini

    SvcOAI -->|"LLM request (fallback)"| OpenRouter

    SvcSup -->|"POST /api/match-movies\nx-worker-secret"| Worker
    SvcSeed -->|"POST /api/insert-movies\nDELETE /api/truncate-movies"| Worker
    Worker -->|"Supabase RPC"| SupabaseDB

    Pages -->|"searchMoviePoster"| SvcTMDB
    SvcTMDB --> TMDB
```

---

## 2. Recommendation Pipeline

Step-by-step sequence from form submission to displaying results.

```mermaid
sequenceDiagram
    actor User
    participant Browser as Browser<br/>(MovieFormClient)
    participant RecAPI as POST /api/recommendations
    participant Pipeline as movie-recommendations<br/>(lib/services)
    participant Gemini as Google Gemini<br/>(via CF AI Gateway)
    participant CFWorker as Cloudflare Worker
    participant Supabase as Supabase<br/>(pgvector)
    participant LLM as LLM<br/>(Gemini / OpenRouter)
    participant TMDB as TMDB API

    User->>Browser: Submit movie preferences<br/>(last participant)
    Browser->>RecAPI: POST participantsData + timeAvailable
    RecAPI->>Pipeline: streamMovieRecommendations()

    Note over Pipeline: 1. Build embedding & normalise<br/>createServerEmbedding(text blob)

    Pipeline->>Gemini: gemini-embedding-001<br/>768-dim vector
    Gemini-->>Pipeline: embedding vector

    Note over Pipeline: 2. Vector similarity search

    Pipeline->>CFWorker: POST /api/match-movies<br/>{ embedding, threshold: 0.25, count: 10 }
    CFWorker->>Supabase: RPC match_movies_4()
    Supabase-->>CFWorker: top-10 similar MovieRecords
    CFWorker-->>Pipeline: matched movies (id, content, similarity)

    Note over Pipeline: 3. LLM streaming with zod schema

    Pipeline->>LLM: system prompt + movie list + user prefs<br/>temperature: 0.65
    LLM-->>Pipeline: Stream chunks via zod schema

    Note over Pipeline: 4. streamObject conversion

    Pipeline-->>RecAPI: Stream text response
    RecAPI-->>Browser: 200 ReadableStream

    Browser->>Browser: consume stream with useObject hook

    loop For each recommended movie
        Browser->>TMDB: searchMoviePoster(title)
        TMDB-->>Browser: poster URL
    end

    Browser-->>User: Recommendations carousel<br/>with posters
```

---

## 3. React Component Tree

Component hierarchy from root layout to leaf UI primitives.

```mermaid
graph TD
    Root["app/layout.tsx\nRootLayout"]
    Ctx["contexts/MovieContext.tsx\nMovieProvider\n(global state)"]
    Header["components/features/Header.tsx\nHeader"]
    Logo["components/features/Logo.tsx\nLogo"]
    Footer["app/layout.tsx\nFooter (inline)"]

    Home["app/(routes)/page.tsx\nHome Page"]
    Setup["components/features/ParticipantsSetup.tsx\nParticipantsSetup"]
    Title["components/features/Title.tsx\nTitle"]

    FormPage["app/(routes)/movieForm/page.tsx\nMovieForm Page"]
    FormClient["app/(routes)/movieForm/MovieFormClient.tsx\nMovieFormClient\n(useActionState)"]
    FormHook["components/features/hooks/useMovieForm.tsx\nuseMovieForm hook"]
    FormFields["components/features/MovieFormFields.tsx\nMovieFormFields"]
    TextArea["components/ui/TextAreaField.tsx\nTextAreaField"]
    TabGroup["components/ui/TabGroup.tsx\nTabGroup"]

    RecPage["app/(routes)/recommendations/page.tsx\nRecommendations Page"]
    RecClient["app/(routes)/recommendations/RecommendationsClient.tsx\nRecommendationsClient\n(useReducer carousel)"]

    Root --> Ctx
    Ctx --> Header
    Header --> Logo
    Ctx --> Home
    Ctx --> FormPage
    Ctx --> RecPage
    Ctx --> Footer

    Home --> Setup
    Setup --> Title

    FormPage --> FormClient
    FormClient --> FormHook
    FormClient --> FormFields
    FormFields --> TextArea
    FormFields --> TabGroup

    RecPage --> RecClient

    Ctx -. "participantsData\ntimeAvailable\ntotalParticipants" .-> FormClient
    Ctx -. "participantsData\ntimeAvailable" .-> RecClient
    Ctx -. "totalParticipants\ntimeAvailable" .-> Setup
```

---

## 4. AI Fallback Logic

Circuit breaker that switches from Google Gemini to OpenRouter on quota errors.

```mermaid
flowchart TD
    Start([Start: get recommendations]) --> CheckGoogle{Google<br/>quotaExhausted?}

    CheckGoogle -- "Yes, check timer\n< 24h?" --> Switch1
    CheckGoogle -- No or > 24h --> ReqGoogle["Try Google Gemini<br/>via CF AI Gateway"]

    ReqGoogle --> CheckResGoogle{Response OK?}
    CheckResGoogle -- Yes --> ParseJSON[Parse JSON stream]
    CheckResGoogle -- "Error 429/403" --> SetGoogleQuota["Mark Google quotaExhausted<br/>(24h cooldown)"]
    SetGoogleQuota --> Switch1

    Switch1[Switch to Minimax] --> CheckMini{Minimax<br/>quotaExhausted?}
    CheckMini -- "Yes, check timer\n< 5m?" --> Switch2
    CheckMini -- No or > 5m --> ReqMini["Try OpenRouter<br/>minimax-m2.5"]

    ReqMini --> CheckResMini{Response OK?}
    CheckResMini -- Yes --> ParseJSON
    CheckResMini -- "Error 429/403" --> SetMiniQuota["Mark Minimax quotaExhausted<br/>(5m cooldown)"]
    SetMiniQuota --> Switch2

    Switch2[Switch to Llama] --> CheckLlama{Llama<br/>quotaExhausted?}
    CheckLlama -- "Yes, check timer\n< 5m?" --> Switch3
    CheckLlama -- No or > 5m --> ReqLlama["Try OpenRouter<br/>llama-3.3-70b"]

    ReqLlama --> CheckResLlama{Response OK?}
    CheckResLlama -- Yes --> ParseJSON
    CheckResLlama -- "Error 429/403" --> SetLlamaQuota["Mark Llama quotaExhausted<br/>(5m cooldown)"]
    SetLlamaQuota --> Switch3

    Switch3[Switch to AutoRouter] --> ReqAuto["Try OpenRouter<br/>openrouter/free"]
    ReqAuto --> CheckResAuto{Response OK?}
    CheckResAuto -- Yes --> ParseJSON
    CheckResAuto -- Error --> ThrowExhausted["Throw error<br/>All models exhausted"]

    ParseJSON --> ValidJSON{Valid JSON?}
    ValidJSON -- Yes --> ReturnRec([Return UI Component])
    ValidJSON -- No --> ExtractHeuristics["fallbackMovieRecommendations<br/>Extract titles from vector text"]
    ExtractHeuristics --> ReturnRec
```
