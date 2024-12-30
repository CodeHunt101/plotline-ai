# PlotlineAI 🎬

PlotlineAI is a group-oriented movie recommendation system that combines AI and collaborative filtering to suggest movies that everyone in the group will enjoy watching together. Perfect for movie nights, family gatherings, or friend meetups.

[![Live Demo](https://img.shields.io/badge/demo-plotline--ai-blue)](https://plotline-ai.vercel.app/)

## 🌟 Key Features

- **Group Movie Selection**
  - Support for up to 10 participants
  - Collaborative filtering based on group preferences
  - Time-based movie filtering

- **Smart Recommendations**
  - Time-aware suggestions based on available watching time
  - Personalised matching considering each person's:
    - Favourite movies
    - Preferred movie type (new/classic)
    - Current mood (fun/serious/inspiring/scary)
    - Favourite film personality

- **User Experience**
  - Movie poster integration via TMDB API
  - Intuitive form progression
  - Dynamic movie carousel for recommendations

- **Advanced Technology**
  - AI-powered suggestions using OpenAI embeddings and chat completion models
  - Modern UI built with Next.js 15, React 19 Tailwind CSS, and DaisyUI
  - Edge computing via Cloudflare Workers for optimal performance
  - Vector similarity search for movie recommendations

## 🛠️ Tech Stack

### Core Technologies
- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, DaisyUI
- **AI/ML**: OpenAI API (embeddings and chat completions)
- **Database**: Supabase (movie data and embeddings)
- **Edge Computing**: Cloudflare Workers
- **Testing**: Jest, React Testing Library

### External APIs
- **TMDB**: Movie poster fetching
- **OpenAI**: AI recommendations
- **Supabase**: Data storage and vector similarity search

## 🚀 Getting Started

### Prerequisites
- Node.js (v18.18.0 or higher)
- npm, yarn, or pnpm
- API keys for TMDB, OpenAI, and Supabase
- Supabase database with pgvector extension enabled

### Installation

1. Clone the repository:
```bash
git clone https://github.com/CodeHunt101/plotline-ai.git
cd plotline-ai
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Configure environment variables:

Create `.env.local` for the Next.js app:
```env
NEXT_PUBLIC_TMBD_ACCESS_TOKEN=your_tmdb_access_token
NEXT_PUBLIC_OPENAI_WORKER_URL=your_openai_worker_url (optional)
NEXT_PUBLIC_SUPABASE_WORKER_URL=your_supabase_worker_url (optional)
```

Create `.dev.vars` for Cloudflare workers:
```env
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_API_KEY=your_supabase_api_key
```

### Database Setup

1. Enable pgvector extension in your Supabase database
2. Create the necessary tables and functions:

```sql
-- Enable pgvector extension
create extension vector;

-- Create movies table with vector similarity search
create table movies_4 (
  id bigserial primary key,
  content text,
  embedding vector(1536)
);

-- Create the similarity search function
create function match_movies_4(
  query_embedding vector(1536),
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

1. Start the Next.js development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

2. Launch Cloudflare Workers:

For OpenAI worker:
```bash
npx wrangler dev --config wrangler.openai.toml
```

For Supabase worker:
```bash
npx wrangler dev --config wrangler.supabase.toml
```

3. Access the application at [http://localhost:3000](http://localhost:3000)

### Testing

```bash
# Run tests in watch mode
npm test
```

### Deployment

1. Deploy Next.js app to Vercel:
```bash
vercel
```

2. Deploy Cloudflare Workers:
```bash
# Deploy OpenAI worker
npx wrangler deploy --config wrangler.openai.toml

# Deploy Supabase worker
npx wrangler deploy --config wrangler.supabase.toml
```

## 📁 Project Structure

```
plotline-ai/
├── app/                      # Next.js app directory
│   ├── (routes)/               # Application routes
│   │   ├── movieForm/            # Movie form page
│   │   ├── recommendations/      # Recommendations page
│   │   └── page.tsx              # Home page
│   ├── api/                    # API routes
│   ├── globals.css             # Global styles
│   └── layout.tsx              # Root layout
├── components/               # React components
│   ├── features/               # Feature-specific components
│   └── ui/                     # Reusable UI components
├── lib/                      # Core utilities
│   ├── config/                 # Configuration files
│   └── services/               # Service integrations
├── contexts/                 # React contexts
├── constants/                # Constants and shared data
├── public/                   # Static assets
├── types/                    # TypeScript type definitions
├── workers/                  # Cloudflare Workers
    ├── openai-worker.ts
    └── supabase-worker.ts

```

## ⚡ Cloudflare Workers Architecture

The application leverages two Cloudflare Workers for enhanced security and performance:

### OpenAI Worker
- Handles all OpenAI API interactions
- Manages embeddings and chat completions
- Ensures API key security
- Rate limiting and error handling

### Supabase Worker
- Manages database operations
- Performs vector similarity searches
- Handles data seeding and updates
- Connection pooling and query optimisation

### Benefits
- Enhanced security through API key protection
- Improved performance via edge computing
- Better scalability and reliability
- Reduced client-side complexity

## ⚠️ AI Limitations

Please note that PlotlineAI uses artificial intelligence for movie recommendations, and while it strives for accuracy:
- Recommendations may not always perfectly match group preferences
- Movie information and details might occasionally be incomplete or imprecise
- The system works best with clear, detailed input from all participants
- Results can vary based on the quality and specificity of user inputs