# PlotlineAI 🎬

A Next.js-powered movie recommendation app that helps groups find the perfect movie for their next watch party. PlotlineAI uses AI to analyse each participant's movie preferences and suggests films that everyone will enjoy.

## Features

- **Group Movie Selection**: Input preferences for up to 10 participants
- **Time-Aware Recommendations**: Suggests movies that fit your available time
- **Personalized Matching**: Takes into account each person's:
  - Favourite movies
  - Preferred movie type (new/classic)
  - Current mood (fun/serious/inspiring/scary)
  - Favourite film personality
- **AI-Powered Suggestions**: Uses OpenAI embeddings and chat completion models for intelligent movie matching
- **Modern UI**: Built with Next.js, Tailwind CSS, and DaisyUI for a sleek user experience

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, DaisyUI
- **AI/ML**: OpenAI API (embeddings and chat completions)
- **Database**: Supabase (for storing movie data and embeddings)

## Other external APIs

- **TMBD**: Used for fetching movie posters

## Getting Started

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

3. Set up environment variables:
Create a `.env` file in the root directory with the following variables:
```env
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_API_KEY=your_supabase_api_key
```

4. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
plotline-ai/
├── app/                    # Next.js app directory
│   ├── (routes)/           # Application routes
│   ├── globals.css         # Global styles
│   └── layout.tsx          # Root layout
├── components/             # React components
│   ├── features/           # Feature-specific components
│   └── ui/                 # Reusable UI components
├── contexts/               # React contexts
├── lib/                    # Utility functions and configurations
├── public/                 # Static assets
├── services/               # External service integrations
└── types/                  # TypeScript type definitions
```
