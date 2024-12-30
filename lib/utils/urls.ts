// utils/url.ts

/**
 * Gets the base URL for the application based on the current environment
 * @param headers - Next.js headers object
 * @returns The base URL string
 */
export function getBaseUrl(headers: Headers): string {
  const host = headers.get('host')

  // For npm run build / preview on local
  if (process.env.NODE_ENV === 'production' && host?.includes('localhost')) {
    return `http://${host}`
  }

  // For development environment
  if (process.env.NODE_ENV === 'development') {
    return `http://${host}`
  }

  // For production environment
  return `https://${host}`
}

/**
 * Creates a full URL by combining the base URL with a path
 * @param baseUrl - The base URL of the application
 * @param path - The path to append (optional)
 * @returns The complete URL
 */
export function createFullUrl(baseUrl: string, path?: string): string {
  return path ? `${baseUrl}${path}` : baseUrl
}
