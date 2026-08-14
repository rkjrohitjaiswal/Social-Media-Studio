/**
/**
 * Resolves the backend API base URL for browser requests.
 * Uses NEXT_PUBLIC_API_URL if configured, otherwise defaults to http://localhost:4000.
 */
export function getApiUrl(path: string = ""): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = getApiUrl(path);
  const defaultHeaders = {
    "Content-Type": "application/json",
  };
  return fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });
}
