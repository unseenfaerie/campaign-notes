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
