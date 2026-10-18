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
const VIEWING_CHARACTER_STORAGE_PREFIX = 'campaign-notes.wiki.viewing-character.'

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

function readStoredViewingCharacterId(username: string): string | null {
    return localStorage.getItem(VIEWING_CHARACTER_STORAGE_PREFIX + username)
}

function writeStoredViewingCharacterId(username: string, characterId: string | null) {
    const key = VIEWING_CHARACTER_STORAGE_PREFIX + username
    if (!characterId) {
        localStorage.removeItem(key)
        return
    }

    localStorage.setItem(key, characterId)
}

const state = reactive({
    accessToken: readStoredToken(),
    user: null as AuthUser | null,
    initialized: false,
    bootstrapping: false,
    viewingCharacterId: null as string | null,
})

function clearSession() {
    state.accessToken = null
    state.user = null
    state.viewingCharacterId = null
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
        restoreViewingCharacterId()
        return true
    } catch (_error) {
        state.user = null
        return false
    }
}

// Restores the browse-as character for the current user: a stored selection takes precedence;
// otherwise players default to their first anchored character and DMs default to omniscient.
function restoreViewingCharacterId() {
    if (!state.user) {
        state.viewingCharacterId = null
        return
    }

    const stored = readStoredViewingCharacterId(state.user.username)
    if (stored) {
        state.viewingCharacterId = stored
        return
    }

    state.viewingCharacterId = state.user.anchoredCharacterIds[0] ?? null
}

function setViewingCharacterId(characterId: string | null) {
    state.viewingCharacterId = characterId
    if (state.user) {
        writeStoredViewingCharacterId(state.user.username, characterId)
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
    getViewingCharacterId: () => state.viewingCharacterId,
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
        isAdmin: computed(() => state.user?.role === 'dm'),
        anchoredCharacterIds: computed(() => state.user?.anchoredCharacterIds ?? []),
        viewingCharacterId: computed(() => state.viewingCharacterId),
        setViewingCharacterId,
        bootstrap,
        login,
        logout,
    }
}
