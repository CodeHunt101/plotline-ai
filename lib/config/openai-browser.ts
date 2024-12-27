import 'openai/shims/web'
import OpenAI from 'openai'

/** OpenAI config */
if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY)
  throw new Error('OpenAI API key is missing or invalid.')
export const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
})
