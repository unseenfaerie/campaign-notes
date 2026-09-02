import { requestJson } from './apiClient'

export type DomainEntity = Record<string, unknown>

export type EntityFullResponse = {
    entity: DomainEntity
    related: Record<string, DomainEntity[]>
    children?: DomainEntity[]
}

export async function listEntities(entityRoute: string): Promise<DomainEntity[]> {
    return requestJson<DomainEntity[]>(`/${entityRoute}`)
}

export async function getEntityFull(entityRoute: string, id: string): Promise<EntityFullResponse> {
    return requestJson<EntityFullResponse>(`/${entityRoute}/${encodeURIComponent(id)}/full`)
}

export async function createEntity(entityRoute: string, data: DomainEntity): Promise<DomainEntity> {
    return requestJson<DomainEntity>(`/${entityRoute}`, { method: 'POST', body: data })
}

export async function updateEntity(entityRoute: string, id: string, data: DomainEntity): Promise<DomainEntity> {
    const response = await requestJson<{ updated: number; record: DomainEntity }>(
        `/${entityRoute}/${encodeURIComponent(id)}`,
        { method: 'PATCH', body: data }
    )
    return response.record
}

export async function deleteEntity(entityRoute: string, id: string): Promise<void> {
    await requestJson<void>(`/${entityRoute}/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function createRelation(
    entityRoute: string,
    id: string,
    relatedRoute: string,
    data: DomainEntity
): Promise<DomainEntity> {
    return requestJson<DomainEntity>(
        `/${entityRoute}/${encodeURIComponent(id)}/${relatedRoute}`,
        { method: 'POST', body: data }
    )
}

export async function updateRelation(
    entityRoute: string,
    id: string,
    relatedRoute: string,
    relatedId: string,
    data: DomainEntity,
    historySelector?: { key: string; value: string }
): Promise<{ updated: number; record: DomainEntity }> {
    const query = historySelector
        ? `?${encodeURIComponent(historySelector.key)}=${encodeURIComponent(historySelector.value)}`
        : ''

    return requestJson<{ updated: number; record: DomainEntity }>(
        `/${entityRoute}/${encodeURIComponent(id)}/${relatedRoute}/${encodeURIComponent(relatedId)}${query}`,
        { method: 'PATCH', body: data }
    )
}

export async function deleteRelation(
    entityRoute: string,
    id: string,
    relatedRoute: string,
    relatedId: string,
    historySelector?: { key: string; value: string }
): Promise<void> {
    const query = historySelector
        ? `?${encodeURIComponent(historySelector.key)}=${encodeURIComponent(historySelector.value)}`
        : ''

    await requestJson<void>(
        `/${entityRoute}/${encodeURIComponent(id)}/${relatedRoute}/${encodeURIComponent(relatedId)}${query}`,
        { method: 'DELETE' }
    )
}

export async function getAliases(entityType: string, entityId: string): Promise<DomainEntity[]> {
    const params = new URLSearchParams({
        entity_type: entityType,
        entity_id: entityId,
    })
    return requestJson<DomainEntity[]>(`/aliases?${params.toString()}`)
}

export async function createAlias(
    entityType: string,
    entityId: string,
    alias: string,
    isPublic: boolean
): Promise<DomainEntity> {
    return requestJson<DomainEntity>('/aliases', {
        method: 'POST',
        body: {
            entity_type: entityType,
            entity_id: entityId,
            alias,
            is_public: isPublic,
        },
    })
}

export async function deleteAlias(id: string): Promise<void> {
    await requestJson<void>(`/aliases/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export function routeToEntityType(route: string): string {
    // Convert route to entity type: 'characters' -> 'character', 'deities' -> 'deity', etc.
    let entityType = route.toLowerCase()
    // Remove trailing 's' for common plurals
    if (entityType.endsWith('s')) {
        entityType = entityType.slice(0, -1)
    }
    return entityType
}
