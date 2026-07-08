export type EntityRouteDefinition = {
    route: string
    label: string
}

export const ENTITY_ROUTES: EntityRouteDefinition[] = [
    { route: 'characters', label: 'Characters' },
    { route: 'deities', label: 'Deities' },
    { route: 'events', label: 'Events' },
    { route: 'items', label: 'Items' },
    { route: 'organizations', label: 'Organizations' },
    { route: 'places', label: 'Places' },
    { route: 'spells', label: 'Spells' },
    { route: 'spheres', label: 'Spheres' },
    { route: 'aliases', label: 'Aliases' },
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
