const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1'

/**
 * Error thrown for every non-2xx response. Mirrors the backend envelope
 * (backend/ERRORS.md): branch on `code`, show `message`, bind `fieldErrors`.
 */
export class ApiRequestError extends Error {
  status: number
  code: string
  fieldErrors: Record<string, string[]>
  requestId?: string

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors: Record<string, string[]> = {},
    requestId?: string,
  ) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = code
    this.fieldErrors = fieldErrors
    this.requestId = requestId
  }
}

interface Envelope<T> {
  success: boolean
  statusCode: number
  message: string
  data: T
  code?: string
  fieldErrors?: Record<string, string[]>
  requestId?: string
}

export interface ApiResult<T> {
  data: T
  message: string
}

async function request<T>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiRequestError(
      0,
      'NETWORK_ERROR',
      'Unable to reach the server. Check your connection and try again.',
    )
  }

  let payload: Envelope<T> | null = null
  try {
    payload = (await res.json()) as Envelope<T>
  } catch {
    // Non-JSON body (e.g. the dev proxy's error page when the API is down).
  }

  if (!res.ok || !payload || payload.success === false) {
    throw new ApiRequestError(
      res.status,
      payload?.code ?? (res.status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST'),
      payload?.message ??
        (res.status >= 500
          ? 'The server is unavailable. Is the API running?'
          : `Request failed with status ${res.status}`),
      payload?.fieldErrors ?? {},
      payload?.requestId ?? res.headers.get('X-Request-Id') ?? undefined,
    )
  }

  return { data: payload.data, message: payload.message }
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path).then((r) => r.data),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T = null>(path: string) => request<T>('DELETE', path),
}

const AUTH_ERROR_CODES = new Set(['UNAUTHORIZED', 'TOKEN_EXPIRED', 'INVALID_TOKEN'])

/** A 401 caused by a missing/expired/invalid session (not bad login credentials). */
export function isSessionError(error: unknown): error is ApiRequestError {
  return error instanceof ApiRequestError && error.status === 401 && AUTH_ERROR_CODES.has(error.code)
}

export function errorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (error instanceof Error && error.message) return error.message
  return fallback
}
