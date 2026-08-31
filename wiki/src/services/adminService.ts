import { requestJson } from './apiClient'

export type AdminUserRole = 'dm' | 'player'

export type AdminUser = {
    id: string
    username: string
    role: AdminUserRole
    disabled: boolean
    createdAt: string
    updatedAt: string
}

export type CharacterAnchor = {
    character_id: string
    user_id: string
    created_at: string
}

export type CreateUserPayload = {
    id: string
    username: string
    password: string
    role?: AdminUserRole
    disabled?: boolean
}

export type UpdateUserPayload = {
    username?: string
    role?: AdminUserRole
    disabled?: boolean
    password?: string
}

export async function listUsers(): Promise<AdminUser[]> {
    return requestJson<AdminUser[]>('/admin/users')
}

export async function createUser(payload: CreateUserPayload): Promise<AdminUser> {
    return requestJson<AdminUser>('/admin/users', { method: 'POST', body: payload })
}

export async function updateUser(userId: string, payload: UpdateUserPayload): Promise<AdminUser> {
    return requestJson<AdminUser>(`/admin/users/${encodeURIComponent(userId)}`, { method: 'PATCH', body: payload })
}

export async function deleteUser(userId: string): Promise<void> {
    return requestJson<void>(`/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' })
}

export async function listAllCharacterAnchors(): Promise<CharacterAnchor[]> {
    return requestJson<CharacterAnchor[]>('/admin/anchors/characters')
}

export async function listUserCharacterAnchors(userId: string): Promise<CharacterAnchor[]> {
    return requestJson<CharacterAnchor[]>(`/admin/users/${encodeURIComponent(userId)}/anchors/characters`)
}

export async function anchorCharacter(userId: string, characterId: string): Promise<CharacterAnchor> {
    return requestJson<CharacterAnchor>(
        `/admin/users/${encodeURIComponent(userId)}/anchors/characters/${encodeURIComponent(characterId)}`,
        { method: 'PUT' },
    )
}

export async function unanchorCharacter(userId: string, characterId: string): Promise<void> {
    return requestJson<void>(
        `/admin/users/${encodeURIComponent(userId)}/anchors/characters/${encodeURIComponent(characterId)}`,
        { method: 'DELETE' },
    )
}
