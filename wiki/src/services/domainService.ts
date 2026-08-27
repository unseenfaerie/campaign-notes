import { requestJson } from './apiClient'

export type DomainEntity = Record<string, unknown>

export type EntityFullResponse = {
    entity: DomainEntity
    related: Record<string, DomainEntity[]>
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
