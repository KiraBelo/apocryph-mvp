/** Safely parse JSON from fetch Response. Returns empty object on parse failure. */
export async function safeJson<T = Record<string, unknown>>(response: Response): Promise<T> {
  try {
    return await response.json()
  } catch {
    return {} as T
  }
}
