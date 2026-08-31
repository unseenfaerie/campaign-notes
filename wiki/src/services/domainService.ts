import { requestJson } from './apiClient'

export type DomainEntity = Record<string, unknown>

export type EditProposalSubmission = {
    message: string
    proposals: unknown[]
}

export type EntityUpdateResult = DomainEntity | EditProposalSubmission
export type RelationUpdateResult = { updated: number; record: DomainEntity } | EditProposalSubmission

export function isEditProposalSubmission(value: unknown): value is EditProposalSubmission {
    return Boolean(
        value &&
        typeof value === 'object' &&
        'message' in value &&
        typeof value.message === 'string' &&
        'proposals' in value &&
        Array.isArray(value.proposals)
    )
}

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

export async function updateEntity(entityRoute: string, id: string, data: DomainEntity): Promise<EntityUpdateResult> {
    const response = await requestJson<{ updated: number; record: DomainEntity } | EditProposalSubmission>(
        `/${entityRoute}/${encodeURIComponent(id)}`,
        { method: 'PATCH', body: data }
    )
    return 'record' in response ? response.record : response
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
): Promise<RelationUpdateResult> {
    const query = historySelector
        ? `?${encodeURIComponent(historySelector.key)}=${encodeURIComponent(historySelector.value)}`
        : ''

    return requestJson<RelationUpdateResult>(
        `/${entityRoute}/${encodeURIComponent(id)}/${relatedRoute}/${encodeURIComponent(relatedId)}${query}`,
        { method: 'PATCH', body: data }
    )
}
