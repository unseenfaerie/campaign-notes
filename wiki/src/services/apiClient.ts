const DEFAULT_API_BASE_URL = 'http://localhost:3001/api'

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined
export const API_BASE_URL = rawBaseUrl?.trim() || DEFAULT_API_BASE_URL

type AccessTokenGetter = () => string | null
type UnauthorizedHandler = () => void
type RefreshHandler = () => Promise<boolean>

let accessTokenGetter: AccessTokenGetter = () => null
let unauthorizedHandler: UnauthorizedHandler = () => undefined
let refreshHandler: RefreshHandler | null = null
let refreshInFlight: Promise<boolean> | null = null

export class ApiError extends Error {
    status: number
    payload: unknown

    constructor(message: string, status: number, payload: unknown) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.payload = payload
    }
}

type RequestJsonOptions = {
    method?: string
    headers?: HeadersInit
    body?: unknown
    auth?: boolean
    retryOnUnauthorized?: boolean
}

export function configureApiClient(options: {
    getAccessToken: AccessTokenGetter
    onUnauthorized: UnauthorizedHandler
    refreshAccessToken?: RefreshHandler
}) {
    accessTokenGetter = options.getAccessToken
    unauthorizedHandler = options.onUnauthorized
    refreshHandler = options.refreshAccessToken ?? null
}

async function refreshAccessTokenOnce(): Promise<boolean> {
    if (!refreshHandler) {
        return false
    }

    if (!refreshInFlight) {
        refreshInFlight = (async () => {
            try {
                return await refreshHandler!()
            } catch (_error) {
                return false
            } finally {
                refreshInFlight = null
            }
        })()
    }

    return refreshInFlight
}

function buildHeaders(inputHeaders: HeadersInit | undefined, body: unknown, auth: boolean): Headers {
    const headers = new Headers(inputHeaders)

    if (!headers.has('Accept')) {
        headers.set('Accept', 'application/json')
    }

    if (auth) {
        const token = accessTokenGetter()
        if (token) {
            headers.set('Authorization', `Bearer ${token}`)
        }
    }

    if (body !== undefined && body !== null && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json')
    }

    return headers
}

function toRequestBody(body: unknown): BodyInit | undefined {
    if (body === undefined || body === null) {
        return undefined
    }

    if (typeof body === 'string' || body instanceof FormData) {
        return body
    }

    return JSON.stringify(body)
}

async function parseResponseBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
        return response.json()
    }

    const text = await response.text()
    return text.length > 0 ? text : null
}

function messageFromPayload(payload: unknown, fallback: string): string {
    if (payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string') {
        return payload.error
    }

    return fallback
}

export async function requestJson<T>(path: string, options: RequestJsonOptions = {}): Promise<T> {
    const auth = options.auth ?? true
    const retryOnUnauthorized = options.retryOnUnauthorized ?? true
    const method = options.method ?? 'GET'

    const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: buildHeaders(options.headers, options.body, auth),
        body: toRequestBody(options.body),
        credentials: 'include',
    })

    const payload = await parseResponseBody(response)

    if (response.ok) {
        return payload as T
    }

    if (response.status === 401 && auth && retryOnUnauthorized && !path.startsWith('/auth/') && refreshHandler) {
        const refreshed = await refreshAccessTokenOnce()
        if (refreshed) {
            return requestJson<T>(path, { ...options, retryOnUnauthorized: false })
        }
    }

    if (response.status === 401 && auth) {
        unauthorizedHandler()
    }

    throw new ApiError(messageFromPayload(payload, `Request failed (${response.status})`), response.status, payload)
}
