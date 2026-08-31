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

