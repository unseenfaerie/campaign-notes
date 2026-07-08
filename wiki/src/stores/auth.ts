import { computed, reactive } from 'vue'
import { configureApiClient } from '../services/apiClient'
import {
  getCurrentUser,
  loginWithPassword,
  logoutSession,
  refreshAccessToken,
  type AuthUser,
} from '../services/authService'

const TOKEN_STORAGE_KEY = 'campaign-notes.wiki.access-token'

function readStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY)
}

function writeStoredToken(token: string | null) {
  if (!token) {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    return
  }

  localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

const state = reactive({
  accessToken: readStoredToken(),
  user: null as AuthUser | null,
  initialized: false,
  bootstrapping: false,
})

function clearSession() {
  state.accessToken = null
  state.user = null
  writeStoredToken(null)
}

function setAccessToken(token: string) {
  state.accessToken = token
  writeStoredToken(token)
}

async function loadCurrentUser(): Promise<boolean> {
  if (!state.accessToken) {
    state.user = null
    return false
  }

  try {
    state.user = await getCurrentUser()
    return true
  } catch (_error) {
    state.user = null
    return false
  }
}

async function refreshTokenSilently(): Promise<boolean> {
  try {
    const refreshed = await refreshAccessToken()
    setAccessToken(refreshed.accessToken)
    return true
  } catch (_error) {
    clearSession()
    return false
  }
}

configureApiClient({
  getAccessToken: () => state.accessToken,
  onUnauthorized: () => {
    clearSession()
  },
  refreshAccessToken: refreshTokenSilently,
})

async function bootstrap() {
  if (state.bootstrapping) {
    return
  }

  state.bootstrapping = true

  try {
    const loadedWithCurrentToken = await loadCurrentUser()
    if (!loadedWithCurrentToken) {
      const refreshed = await refreshTokenSilently()
      if (refreshed) {
        await loadCurrentUser()
      }
    }
  } finally {
    state.initialized = true
    state.bootstrapping = false
  }
}

async function login(username: string, password: string) {
  const tokenResponse = await loginWithPassword(username, password)
  setAccessToken(tokenResponse.accessToken)
  await loadCurrentUser()
}

async function logout() {
  try {
    await logoutSession()
  } finally {
    clearSession()
  }
}

export function useAuthStore() {
  return {
    user: computed(() => state.user),
    initialized: computed(() => state.initialized),
    isAuthenticated: computed(() => Boolean(state.accessToken) && Boolean(state.user)),
    bootstrap,
    login,
    logout,
  }
}
