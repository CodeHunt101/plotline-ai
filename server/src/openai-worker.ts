/* eslint-disable import/no-anonymous-default-export */
import OpenAI from 'openai'

interface Env {
  OPENAI_API_KEY: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
} as const

async function handleMovieRecommendations(
  request: Request,
  openai: OpenAI
): Promise<Response> {
  const { messages } = await request.json()
  const chatCompletion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    temperature: 0.65,
    frequency_penalty: 0.5,
    response_format: {
      type: 'json_object',
    },
  })

  return new Response(JSON.stringify(chatCompletion.choices[0].message), {
    headers: corsHeaders,
  })
}

async function handleEmbeddings(
  request: Request,
  openai: OpenAI
): Promise<Response> {
  const { input, dimensions } = await request.json()
  const embeddingResponse = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input,
    dimensions: dimensions || 1536, // Use provided dimensions or default to 1536
  })

  return new Response(
    JSON.stringify({ embedding: embeddingResponse.data[0].embedding }),
    {
      headers: corsHeaders,
    }
  )
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: `${request.method} method not allowed.` }),
        {
          status: 405,
          headers: corsHeaders,
        }
      )
    }

    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      baseURL:
        'https://gateway.ai.cloudflare.com/v1/856595425da2f9c8b3c7dd28c959f2a6/plotline-ai/openai',
    })

    // Get the pathname from the request URL
    const url = new URL(request.url)
    const pathname = url.pathname

    try {
      // Route requests based on the pathname
      switch (pathname) {
        case '/api/movies':
          return await handleMovieRecommendations(request, openai)
        case '/api/embeddings':
          return await handleEmbeddings(request, openai)
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
