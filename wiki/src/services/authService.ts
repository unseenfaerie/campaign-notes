import { requestJson } from './apiClient'

export type AuthUser = {
  id: string
  username: string
  role: string
}

type AuthTokenResponse = {
  tokenType: 'Bearer'
  accessToken: string
  expiresIn: string
}

export async function loginWithPassword(username: string, password: string): Promise<AuthTokenResponse> {
  return requestJson<AuthTokenResponse>('/auth/token', {
    method: 'POST',
    auth: false,
    retryOnUnauthorized: false,
    body: {
      username,
      password,
    },
  })
}

export async function refreshAccessToken(): Promise<AuthTokenResponse> {
  return requestJson<AuthTokenResponse>('/auth/refresh', {
    method: 'POST',
    auth: false,
    retryOnUnauthorized: false,
  })
}

export async function logoutSession(): Promise<void> {
  await requestJson('/auth/logout', {
    method: 'POST',
    auth: false,
    retryOnUnauthorized: false,
  })
}

export async function getCurrentUser(): Promise<AuthUser> {
  return requestJson<AuthUser>('/auth/me')
}
