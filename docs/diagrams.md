# PlotlineAI — Architecture Diagrams

## 1. System Architecture

High-level view of all layers: browser, Next.js, services, and external APIs.

```mermaid
graph TD
    Browser["Browser\n(React + MovieContext)"]

    subgraph NextJS["Next.js App"]
        Pages["Pages\n/  /movieForm  /recommendations"]
        API_Rec["POST /api/recommendations"]
        API_Emb["POST /api/embeddings"]
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
        OpenRouter["OpenRouter\nminimax-m2.5"]
        SupabaseDB["Supabase Postgres\nmovies_4 + pgvector\nmatch_movies_4 RPC"]
        TMDB["TMDB API\nmovie posters"]
    end

    Browser -->|"form submit / navigate"| Pages
    Pages -->|"fetch"| API_Rec
    Pages -->|"fetch"| API_Emb
    API_Rec --> SvcRec
    SvcRec --> SvcEmb
    SvcRec --> SvcSup
    SvcRec --> SvcOAI
    API_Emb --> SvcEmb
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
    participant EmbAPI as POST /api/embeddings
    participant Gemini as Google Gemini<br/>(via CF AI Gateway)
    participant CFWorker as Cloudflare Worker
    participant Supabase as Supabase<br/>(pgvector)
    participant LLM as LLM<br/>(Gemini / OpenRouter)
    participant TMDB as TMDB API

    User->>Browser: Submit movie preferences<br/>(last participant)
    Browser->>RecAPI: POST participantsData + timeAvailable
    RecAPI->>Pipeline: buildMovieRecommendations()

    Note over Pipeline: 1. Build embedding input<br/>format all preferences into text blob

    Pipeline->>EmbAPI: POST text blob
    EmbAPI->>Gemini: gemini-embedding-001<br/>768-dim vector
    Gemini-->>EmbAPI: embedding vector
    EmbAPI-->>Pipeline: L2-normalised vector

    Note over Pipeline: 2. Vector similarity search

    Pipeline->>CFWorker: POST /api/match-movies<br/>{ embedding, threshold: 0.25, count: 10 }
    CFWorker->>Supabase: RPC match_movies_4()
    Supabase-->>CFWorker: top-10 similar MovieRecords
    CFWorker-->>Pipeline: matched movies (id, content, similarity)

    Note over Pipeline: 3. LLM re-ranking

    Pipeline->>LLM: system prompt + movie list + user prefs<br/>temperature: 0.65
    LLM-->>Pipeline: JSON { recommendedMovies: [...] }

    Note over Pipeline: 4. Parse & fallback<br/>If JSON invalid → extract from vector results

    Pipeline-->>RecAPI: MovieRecommendation
    RecAPI-->>Browser: 200 { result, match }

    Browser->>Browser: store in MovieContext<br/>router.replace(/recommendations)

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

    Ctx -. "participantsData\nrecommendations\ntimeAvailable\ntotalParticipants" .-> FormClient
    Ctx -. "recommendations" .-> RecClient
    Ctx -. "totalParticipants\ntimeAvailable" .-> Setup
```

---

## 4. AI Fallback Logic

Circuit breaker that switches from Google Gemini to OpenRouter on quota errors.

```mermaid
flowchart TD
    A([Start: get recommendations]) --> B{quotaExhausted?}

    B -- No --> D["Use Google Gemini<br/>via CF AI Gateway"]
    B -- "Yes, check timer" --> L{"Time since<br/>exhaustedAt > 24h?"}

    L -- Yes --> M[Reset quotaExhausted flag]
    M --> D
    L -- No --> C["Use OpenRouter<br/>minimax-m2.5"]

    D --> E{Response OK?}
    E -- Yes --> F[Parse JSON response]
    C --> F

    E -- "Error 429 or 403" --> G["Set quotaExhausted = true<br/>Record exhaustedAt timestamp"]
    G --> H["Use OpenRouter<br/>minimax-m2.5 as fallback"]
    H --> F

    F --> I{Valid JSON?}
    I -- Yes --> J([Return MovieRecommendation])
    I -- No --> K["fallbackMovieRecommendations<br/>Extract titles from<br/>vector search results"]
    K --> J
```
