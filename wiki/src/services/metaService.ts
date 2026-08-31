import { requestJson } from './apiClient'
import type { DateSystem } from '../utils/loreDate'

export type EntityFieldSchema = {
    name: string
    type: 'string' | 'number' | 'boolean' | 'loreDate' | 'realDate'
    required: boolean
    primary: boolean
    ref?: string
    format?: string
    autoIncrement?: boolean
    enum?: string[]
    hidden?: boolean
    expository?: boolean
    playerEditable?: boolean
}

export type EntitySchema = {
    name: string
    route: string
    label: string
    singularLabel: string
    navigation: boolean
    default: boolean
    idField: string
    fields: EntityFieldSchema[]
}

export type RelationFormSchema = {
    relatedRoute: string
    relationName: string
    kind: 'simple' | 'relationship' | 'history'
    relatedEntityRoute: string
    relatedEntityLabel: string
    historyKey?: string | null
    fields: EntityFieldSchema[]
}

export type EntitySchemasResponse = {
    entities: EntitySchema[]
    relationsByEntityRoute: Record<string, RelationFormSchema[]>
    dateSystem: DateSystem
}

let schemasPromise: Promise<EntitySchemasResponse> | null = null

export function getEntitySchemas(): Promise<EntitySchemasResponse> {
    if (!schemasPromise) {
        schemasPromise = requestJson<EntitySchemasResponse>('/meta')
    }

    return schemasPromise
}

export async function getEntitySchema(entityRoute: string): Promise<EntitySchema | undefined> {
    const schemas = await getEntitySchemas()
    return schemas.entities.find((entity) => entity.route === entityRoute)
}

export async function getDefaultEntityRoute(): Promise<string> {
    const schemas = await getEntitySchemas()
    return schemas.entities.find((entity) => entity.default)?.route ?? schemas.entities[0]?.route ?? ''
}

export async function getRelationSchemas(entityRoute: string): Promise<RelationFormSchema[]> {
    const schemas = await getEntitySchemas()
    return schemas.relationsByEntityRoute[entityRoute] ?? []
}

export async function getDateSystem(): Promise<DateSystem> {
    const schemas = await getEntitySchemas()
    return schemas.dateSystem
}

// Edit Proposals API

export type EditProposal = {
    id: string
    proposed_by_user_id: string
    entity_route: string
    entity_id: string
    relation_name?: string | null
    relation_member_ids?: string | null
    field_name: string
    old_value?: string | null
    new_value: string
    proposal_type: 'field-edit' | 'relation-create'
    status: 'pending' | 'approved' | 'rejected'
    rejected_reason?: string | null
    created_at: string
    reviewed_by_user_id?: string | null
    reviewed_at?: string | null
}

export async function getEditProposals(status?: string) {
    const query = status ? `?status=${status}` : ''
    return requestJson<{ proposals: EditProposal[]; count: number }>(`/meta/edit-proposals${query}`)
}

export async function getUserProposals(userId: string, status?: string, limit: number = 50) {
    const query = new URLSearchParams()
    if (status) query.append('status', status)
    query.append('limit', limit.toString())
    const queryStr = query.toString()
    return requestJson<{ proposals: EditProposal[]; count: number }>(
        `/meta/edit-proposals/by-user/${userId}${queryStr ? '?' + queryStr : ''}`
    )
}

export async function getProposalStats() {
    return requestJson<{ total: number; pending: number; approved: number; rejected: number }>(
        '/meta/edit-proposals-stats'
    )
}

export async function reviewProposal(proposalId: string, action: 'approve' | 'reject', reason?: string) {
    return requestJson<{ message: string; proposal: EditProposal }>('/meta/edit-proposals/' + proposalId, {
        method: 'PATCH',
        body: JSON.stringify({ action, reason }),
        headers: { 'Content-Type': 'application/json' },
    })
}

