/* eslint-disable @typescript-eslint/no-require-imports */

if (process.env.NODE_ENV === 'test') {
  require('openai/shims/node')
}

const createOpenAIClient = () => {
  // Now we can safely import OpenAI
  const OpenAI = require('openai').default

  if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY)
    throw new Error('OpenAI API key is missing or invalid.')

  return new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
  })
}

export const openai = createOpenAIClient()
