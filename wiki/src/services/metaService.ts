import { requestJson } from './apiClient'

export type EntityFieldSchema = {
    name: string
    type: 'string' | 'number' | 'boolean'
    required: boolean
    primary: boolean
    format?: string
    autoIncrement?: boolean
    widget?: string
}

export type EntitySchema = {
    name: string
    route: string
    idField: string
    fields: EntityFieldSchema[]
}

export type EntitySchemasResponse = {
    entities: EntitySchema[]
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
