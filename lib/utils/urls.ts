// utils/url.ts

/** Site origin for absolute URLs on the server; uses `http` for localhost (including production builds against local preview). */
export function getBaseUrl(headers: Headers): string {
  const host = headers.get("host");

  // For npm run build / preview on local
  if (process.env.NODE_ENV === "production" && host?.includes("localhost")) {
    return `http://${host}`;
  }

  // For development environment
  if (process.env.NODE_ENV === "development") {
    return `http://${host}`;
  }

  // For production environment
  return `https://${host}`;
}

/** Concatenates base and optional path (caller controls trailing slash on `baseUrl`). */
export function createFullUrl(baseUrl: string, path?: string): string {
  return path ? `${baseUrl}${path}` : baseUrl;
}
