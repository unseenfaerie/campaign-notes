/**
 * Visibility filtering for entities and relations based on user role and character anchoring.
 *
 * Rules:
 * - DM (role='dm'): Sees all entities and relations (bypass all checks)
 * - Player (role='player'): Sees anchored characters + their relations + related entity pages + public entities/relations
 * - Viewer (role='viewer'): Sees only public entities/relations
 *
 * Visibility is controlled by the is_public boolean field on each entity instance.
 */

const { domainManifest } = require('../../common/domainManifest');

/**
 * Check if a user has the DM role
 */
function isDm(user) {
    return user && user.role === 'dm' ? true : false;
}

/**
 * Check if an entity is anchored to this user (only applies to Character entities)
 */
function isAnchoredCharacter(entityRoute, entityId, anchoredCharacterIds = []) {
    return entityRoute === 'characters' && anchoredCharacterIds.includes(entityId);
}

/**
 * Get the entity definition from the manifest by route
 */
function getEntityDefByRoute(entityRoute) {
    for (const [, entityDef] of Object.entries(domainManifest.entities)) {
        if (entityDef.route === entityRoute) {
            return entityDef;
        }
    }
    return null;
}

/**
 * Get the entity name from route
 */
function getEntityNameByRoute(entityRoute) {
    for (const [entityName, entityDef] of Object.entries(domainManifest.entities)) {
        if (entityDef.route === entityRoute) {
            return entityName;
        }
    }
    return null;
}

/**
 * Get the route name for an entity name
 */
function getRouteByEntityName(entityName) {
    const entityDef = domainManifest.entities[entityName];
    return entityDef ? entityDef.route : null;
}

/**
 * Check if an entity instance is public
 *
 * @param {object} entity - the entity object with is_public field
 * @returns {boolean}
 */
function isEntityPublic(entity) {
    return entity && entity.is_public === true ? true : false;
}

/**
 * Check if an entity is visible to a user
 *
 * Visibility rules:
 * - DM: always visible
 * - Anchored character: visible to owner (must be player role)
 * - Public entity: visible to all authenticated users (DM, player, viewer) and unauthenticated (null) users
 * - Other entities: not visible
 *
 * @param {object} entity - the entity object with id and is_public fields
 * @param {string} entityRoute - the entity route (e.g., 'characters', 'places')
 * @param {object} user - the auth user object with { role, userId, etc } or null
 * @param {string[]} anchoredCharacterIds - list of character IDs anchored to this user
 * @returns {boolean}
 */
function isEntityVisibleToUser(entity, entityRoute, user, anchoredCharacterIds = []) {
    if (!entity) {
        return false;
    }

    // DM sees everything
    if (isDm(user)) {
        return true;
    }

    // Viewers can only see public entities
    if (user && user.role === 'viewer') {
        return isEntityPublic(entity);
    }

    // Players can see anchored characters and public entities
    if (user && user.role === 'player') {
        // Check if anchored character
        if (isAnchoredCharacter(entityRoute, entity.id, anchoredCharacterIds)) {
            return true;
        }
        // Check if public
        if (isEntityPublic(entity)) {
            return true;
        }
        return false;
    }

    // No user (null/undefined) can only see public entities
    if (!user) {
        return isEntityPublic(entity);
    }

    // Not visible otherwise
    return false;
}

/**
 * Get both member entities of a relation by name and their IDs
 *
 * @param {string} relationName - the relation name (e.g., 'CharacterDeity')
 * @param {object} relationRecord - the relation record with keys like character_id, deity_id, etc
 * @returns {object} { memberRoutes: [route1, route2], memberIds: [id1, id2], memberNames: [name1, name2] }
 */
function getRelationMembers(relationName, relationRecord) {
    const relationDef = domainManifest.relations[relationName];
    if (!relationDef) {
        return { memberRoutes: [], memberIds: [], memberNames: [] };
    }

    const memberRoutes = [];
    const memberIds = [];
    const memberNames = [];

    for (const member of relationDef.members) {
        // Get the actual route for this entity type
        const entityRoute = getRouteByEntityName(member.entity);
        memberRoutes.push(entityRoute);
        memberNames.push(member.entity);
        memberIds.push(relationRecord[member.key]);
    }

    return { memberRoutes, memberIds, memberNames };
}

/**
 * Determine which member entities in a relation are visible to a user.
 * Returns indices of visible members.
 *
 * @param {string} relationName - the relation name (e.g., 'CharacterDeity')
 * @param {object} relationRecord - the relation record
 * @param {object} memberEntities - object with member entities: { 0: entityObj, 1: entityObj }
 * @param {object} user - the auth user object
 * @param {string[]} anchoredCharacterIds - list of anchored character IDs for this user
 * @returns {number[]} indices of visible members (0, 1, or [0, 1])
 */
function getVisibleMemberIndices(relationName, relationRecord, memberEntities, user, anchoredCharacterIds = []) {
    // DM sees all relation members
    if (isDm(user)) {
        return [0, 1];
    }

    const { memberRoutes } = getRelationMembers(relationName, relationRecord);
    const visibleIndices = [];

    for (let i = 0; i < memberRoutes.length; i++) {
        const memberEntity = memberEntities[i];
        if (memberEntity && isEntityVisibleToUser(memberEntity, memberRoutes[i], user, anchoredCharacterIds)) {
            visibleIndices.push(i);
        }
    }

    return visibleIndices;
}

/**
 * Check if a relation is visible to a user (both members must be visible)
 *
 * Visibility for a relation requires BOTH member entities to be visible to the user.
 *
 * @param {string} relationName - the relation name (e.g., 'CharacterDeity')
 * @param {array} memberEntities - array of member entities [entity1, entity2] with id and is_public fields
 * @param {object} user - the auth user object
 * @param {string[]} anchoredCharacterIds - list of anchored character IDs for this user
 * @returns {boolean}
 */
function isRelationVisibleToUser(relationName, memberEntities, user, anchoredCharacterIds = []) {
    // DM sees all relations
    if (isDm(user)) {
        return true;
    }

    // Must have both members
    if (!Array.isArray(memberEntities) || memberEntities.length < 2 || !memberEntities[0] || !memberEntities[1]) {
        return false;
    }

    // Get the relation definition to find member routes
    const relationDef = domainManifest.relations[relationName];
    if (!relationDef || !relationDef.members || relationDef.members.length < 2) {
        return false;
    }

    const memberRoute0 = getRouteByEntityName(relationDef.members[0].entity);
    const memberRoute1 = getRouteByEntityName(relationDef.members[1].entity);

    // Viewers can only see relations where both members are public
    if (user && user.role === 'viewer') {
        return isEntityPublic(memberEntities[0]) && isEntityPublic(memberEntities[1]);
    }

    // Players can see relations where both members are visible
    if (user && user.role === 'player') {
        return isEntityVisibleToUser(memberEntities[0], memberRoute0, user, anchoredCharacterIds)
            && isEntityVisibleToUser(memberEntities[1], memberRoute1, user, anchoredCharacterIds);
    }

    // Null user or no auth: only see public relations
    return isEntityPublic(memberEntities[0]) && isEntityPublic(memberEntities[1]);
}

/**
 * Filter a list of entities to only those visible to a user
 *
 * @param {array} entities - array of entity records with id and is_public fields
 * @param {string} entityRoute - the entity route (e.g., 'characters', 'places')
 * @param {object} user - the auth user object
 * @param {string[]} anchoredCharacterIds - list of anchored character IDs for this user
 * @returns {array} filtered entities
 */
function filterEntitiesByVisibility(entities, entityRoute, user, anchoredCharacterIds = []) {
    return entities.filter(entity => {
        return isEntityVisibleToUser(entity, entityRoute, user, anchoredCharacterIds);
    });
}

module.exports = {
    isDm,
    isAnchoredCharacter,
    getEntityDefByRoute,
    getEntityNameByRoute,
    getRouteByEntityName,
    isEntityPublic,
    isEntityVisibleToUser,
    getRelationMembers,
    getVisibleMemberIndices,
    isRelationVisibleToUser,
    filterEntitiesByVisibility,
};
