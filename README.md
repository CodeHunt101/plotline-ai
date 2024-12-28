# PlotlineAI 🎬

PlotlineAI is a Next.js-powered movie recommendation app that helps groups find the perfect movie for their next watch party. Using AI to analyse each participant's movie preferences, it suggests films that everyone will enjoy.

[![Live Demo](https://img.shields.io/badge/demo-plotline--ai-blue)](https://plotline-ai.pages.dev/)

## 🌟 Key Features

- **Group Movie Selection**
  - Support for up to 10 participants
  - Collaborative filtering based on group preferences

- **Smart Recommendations**
  - Time-aware suggestions based on available watching time
  - Personalised matching considering each person's:
    - Favourite movies
    - Preferred movie type (new/classic)
    - Current mood (fun/serious/inspiring/scary)
    - Favourite film personality

- **Advanced Technology**
  - AI-powered suggestions using OpenAI embeddings and chat completion models
  - Modern UI built with Next.js 15, React 19 Tailwind CSS, and DaisyUI
  - Edge computing via Cloudflare Workers for optimal performance

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
- **Supabase**: Data storage

## 🚀 Getting Started

### Prerequisites
- Node.js (v18.18.0 or higher)
- npm, yarn, or pnpm
- API keys for TMDB, OpenAI, and Supabase

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

# Run tests for CI
npm run test:ci
```

## 📁 Project Structure

```
plotline-ai/
├── app/                    # Next.js app directory
│   ├── (routes)/             # Application routes
│   ├── globals.css           # Global styles
│   └── layout.tsx            # Root layout
├── components/             # React components
│   ├── features/             # Feature-specific components
│   └── ui/                   # Reusable UI components
├── contexts/               # React contexts
├── lib/                    # Utility functions and configurations
├── public/                 # Static assets
├── server/                 # Cloudflare Workers
│   └── src/                  # Worker source code
├── services/               # External service integrations
└── types/                  # TypeScript type definitions
```

## ⚡ Cloudflare Workers Architecture

The application leverages two Cloudflare Workers for enhanced security and performance:

### OpenAI Worker
- Handles all OpenAI API interactions
- Manages embeddings and chat completions
- Ensures API key security

### Supabase Worker
- Manages database operations
- Performs vector similarity searches

### Benefits
- Enhanced security through API key protection
- Improved performance via edge computing
- Better scalability and reliability
- Reduced client-side complexity
