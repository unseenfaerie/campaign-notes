import { requestJson } from './apiClient'

export type EntityFieldSchema = {
    name: string
    type: 'string' | 'number' | 'boolean'
    required: boolean
    primary: boolean
    format?: string
    autoIncrement?: boolean
}

export type EntitySchema = {
    name: string
    route: string
    idField: string
    fields: EntityFieldSchema[]
}

export type RelationFormSchema = {
    relatedRoute: string
    relationName: string
    kind: 'simple' | 'relationship' | 'history'
    relatedEntityRoute: string
    fields: EntityFieldSchema[]
}

export type EntitySchemasResponse = {
    entities: EntitySchema[]
    relationsByEntityRoute: Record<string, RelationFormSchema[]>
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

export async function getRelationSchemas(entityRoute: string): Promise<RelationFormSchema[]> {
    const schemas = await getEntitySchemas()
    return schemas.relationsByEntityRoute[entityRoute] ?? []
}
