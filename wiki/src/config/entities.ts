export type EntityRouteDefinition = {
    route: string
    label: string
    singularLabel: string
}

export const ENTITY_ROUTES: EntityRouteDefinition[] = [
    { route: 'characters', label: 'Characters', singularLabel: 'Character' },
    { route: 'deities', label: 'Deities', singularLabel: 'Deity' },
    { route: 'events', label: 'Events', singularLabel: 'Event' },
    { route: 'items', label: 'Items', singularLabel: 'Item' },
    { route: 'organizations', label: 'Organizations', singularLabel: 'Organization' },
    { route: 'places', label: 'Places', singularLabel: 'Place' },
    { route: 'spells', label: 'Spells', singularLabel: 'Spell' },
    { route: 'spheres', label: 'Spheres', singularLabel: 'Sphere' },
    { route: 'aliases', label: 'Aliases', singularLabel: 'Alias' },
]

export const DEFAULT_ENTITY_ROUTE = ENTITY_ROUTES[0].route
const routeSet = new Set(ENTITY_ROUTES.map((entry) => entry.route))

export function isKnownEntityRoute(route: string): boolean {
    return routeSet.has(route)
}

export function entityLabelFromRoute(route: string): string {
    const found = ENTITY_ROUTES.find((entry) => entry.route === route)
    return found?.label ?? route
}

export function entitySingularLabelFromRoute(route: string): string {
    const found = ENTITY_ROUTES.find((entry) => entry.route === route)
    return found?.singularLabel ?? route
}
