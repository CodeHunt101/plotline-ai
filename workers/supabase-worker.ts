/* eslint-disable import/no-anonymous-default-export */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js'

interface Env {
  SUPABASE_URL: string
  SUPABASE_API_KEY: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
} as const

async function handleInsertMovies(
  request: Request,
  supabase: any
): Promise<Response> {
  const { batch } = await request.json()
  const { error } = await supabase.from('movies_4').insert(batch)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: corsHeaders,
  })
}

async function handleisMovieEmbeddingsTableEmpty(supabase: any): Promise<Response> {
  const { data: existingData, error } = await supabase
    .from('movies_4')
    .select('id')
    .limit(1)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    })
  }

  return new Response(JSON.stringify({ isEmpty: existingData.length === 0 }), {
    headers: corsHeaders,
  })
}

async function handleMatchMovies(
  request: Request,
  supabase: any
): Promise<Response> {
  const { embedding } = await request.json()
  const { data, error } = await supabase.rpc('match_movies_4', {
    query_embedding: embedding,
    match_threshold: 0.3,
    match_count: 10,
  })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    })
  }

  return new Response(JSON.stringify({ matches: data }), {
    headers: corsHeaders,
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_API_KEY)

    // Get the pathname from the request URL
    const url = new URL(request.url)
    const pathname = url.pathname

    try {
      switch (pathname) {
        case '/api/check-empty':
          return await handleisMovieEmbeddingsTableEmpty(supabase)
        case '/api/insert-movies':
          return await handleInsertMovies(request, supabase)
        case '/api/match-movies':
          return await handleMatchMovies(request, supabase)
        default:
          return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
            status: 404,
            headers: corsHeaders,
          })
      }
    } catch (e) {
      const error = e as Error
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: corsHeaders,
      })
    }
  },
}
