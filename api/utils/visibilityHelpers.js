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
 * Check if a relation is visible to a user
 *
 * Visibility for a relation:
 * - DM: sees all relations
 * - Player: sees relations where both members are visible, OR where at least one member is an anchored character
 * - Viewer: sees relations where both members are public
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

    // Players can see relations where:
    // - Both members are visible, OR
    // - At least one member is an anchored character (allows seeing relations to private entities)
    if (user && user.role === 'player') {
        const member0Visible = isEntityVisibleToUser(memberEntities[0], memberRoute0, user, anchoredCharacterIds);
        const member1Visible = isEntityVisibleToUser(memberEntities[1], memberRoute1, user, anchoredCharacterIds);
        const member0Anchored = isAnchoredCharacter(memberRoute0, memberEntities[0].id, anchoredCharacterIds);
        const member1Anchored = isAnchoredCharacter(memberRoute1, memberEntities[1].id, anchoredCharacterIds);

        // Both members visible (standard visibility) OR at least one is anchored (relation visibility)
        return (member0Visible && member1Visible) || member0Anchored || member1Anchored;
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

/**
 * Check if an entity is related to any anchored characters
 *
 * Checks all relations in the manifest to see if this entity has a relation
 * connecting it to any of the player's anchored characters.
 * Handles both cross-entity relations and self-relations (e.g., Character to Character).
 *
 * @param {object} manifestCrudService - the CRUD service for database access
 * @param {string} entityRoute - the entity route (e.g., 'places', 'items')
 * @param {string} entityId - the entity id
 * @param {string[]} anchoredCharacterIds - list of anchored character IDs for this user
 * @returns {Promise<boolean>} true if related to any anchored character
 */
async function isEntityRelatedToAnchoredCharacter(manifestCrudService, entityRoute, entityId, anchoredCharacterIds = []) {
    if (!anchoredCharacterIds || anchoredCharacterIds.length === 0) {
        return false;
    }

    // Find the entity name for this route
    const entityName = getEntityNameByRoute(entityRoute);
    if (!entityName) {
        return false;
    }

    // Check all relations in the manifest
    for (const [relationName, relationDef] of Object.entries(domainManifest.relations)) {
        if (!relationDef.members || relationDef.members.length < 2) {
            continue;
        }

        // Find all indices where this relation involves our entity type
        const entityMemberIndices = [];
        for (let i = 0; i < relationDef.members.length; i++) {
            if (relationDef.members[i].entity === entityName) {
                entityMemberIndices.push(i);
            }
        }

        // If this relation doesn't involve our entity type, skip it
        if (entityMemberIndices.length === 0) {
            continue;
        }

        // Case 1: Self-relation where both members are the same entity type
        if (entityMemberIndices.length === 2) {
            const member0 = relationDef.members[0];
            const member1 = relationDef.members[1];

            // Check if this entity is related to any anchored character in either direction
            for (const anchoredCharacterId of anchoredCharacterIds) {
                try {
                    // Direction 1: entity is member 0, anchored char is member 1
                    const record1 = await manifestCrudService.getOne(relationName, {
                        [member0.key]: entityId,
                        [member1.key]: anchoredCharacterId,
                    });
                    if (record1) return true;

                    // Direction 2: entity is member 1, anchored char is member 0
                    const record2 = await manifestCrudService.getOne(relationName, {
                        [member0.key]: anchoredCharacterId,
                        [member1.key]: entityId,
                    });
                    if (record2) return true;
                } catch (error) {
                    // If query fails, continue to next relation
                    continue;
                }
            }
        }
        // Case 2: Cross-entity relation where one member is our entity and the other is different
        else if (entityMemberIndices.length === 1) {
            const entityMemberIndex = entityMemberIndices[0];
            const otherMemberIndex = 1 - entityMemberIndex;
            const entityMember = relationDef.members[entityMemberIndex];
            const otherMember = relationDef.members[otherMemberIndex];

            // Check if this entity is related to any anchored character
            for (const anchoredCharacterId of anchoredCharacterIds) {
                try {
                    const record = await manifestCrudService.getOne(relationName, {
                        [entityMember.key]: entityId,
                        [otherMember.key]: anchoredCharacterId,
                    });
                    if (record) return true;
                } catch (error) {
                    // If query fails, continue to next relation
                    continue;
                }
            }
        }
    }

    return false;
}

/**
 * Get the full transitive closure of visible entity IDs for a user
 *
 * Performs BFS traversal from all anchored character IDs through all relations,
 * collecting every entity reachable from the player's characters. This implements
 * clustered visibility: players see everything their characters connect to, recursively.
 *
 * Algorithm:
 * 1. Start with all anchored character IDs in a queue
 * 2. For each entity, find all relations connecting to it
 * 3. Add related entities to queue if not yet visited
 * 4. Continue until queue is empty
 * 5. Return Set of all visited entity IDs
 *
 * @param {object} manifestCrudService - the CRUD service for database access
 * @param {string[]} anchoredCharacterIds - list of anchored character IDs for this user
 * @returns {Promise<Set<string>>} Set of all entity IDs visible through transitive relations
 */
async function getVisibleEntityIdsForUser(manifestCrudService, anchoredCharacterIds = [], maxHops) {
    const visibleIds = new Set();

    // If no anchored characters, user sees nothing (public entities handled elsewhere)
    if (!anchoredCharacterIds || anchoredCharacterIds.length === 0) {
        return visibleIds;
    }

    // Initialize queue with all anchored characters at hop depth 0
    // Queue entries are { id, hopDepth }
    const queue = anchoredCharacterIds.map(id => ({ id, hopDepth: 0 }));
    const visited = new Set(anchoredCharacterIds);

    // Add anchored characters to visible set
    for (const charId of anchoredCharacterIds) {
        visibleIds.add(charId);
    }

    // BFS traversal: for each entity, find all related entities up to maxHops distance
    while (queue.length > 0) {
        const { id: currentEntityId, hopDepth: currentHopDepth } = queue.shift();

        // Check if we should continue expanding from this entity (respects maxHops limit)
        // Skip relation queries entirely if we've reached or exceeded the hop limit
        const shouldExpandFurther = maxHops === undefined || currentHopDepth < maxHops;
        if (!shouldExpandFurther) {
            continue;
        }

        // Find all relations that include this entity
        for (const [relationName, relationDef] of Object.entries(domainManifest.relations)) {
            if (!relationDef.members || relationDef.members.length < 2) {
                continue;
            }

            const member0 = relationDef.members[0];
            const member1 = relationDef.members[1];

            try {
                // Case 1: Self-relation (both members same type, e.g., CharacterRelationship)
                if (member0.entity === member1.entity) {
                    // Query in both directions
                    const records1 = await manifestCrudService.getMany(relationName, {
                        [member0.key]: currentEntityId,
                    });
                    if (Array.isArray(records1)) {
                        for (const record of records1) {
                            const relatedId = record[member1.key];
                            if (relatedId && !visited.has(relatedId)) {
                                visited.add(relatedId);
                                visibleIds.add(relatedId);
                                queue.push({ id: relatedId, hopDepth: currentHopDepth + 1 });
                            }
                        }
                    }

                    const records2 = await manifestCrudService.getMany(relationName, {
                        [member1.key]: currentEntityId,
                    });
                    if (Array.isArray(records2)) {
                        for (const record of records2) {
                            const relatedId = record[member0.key];
                            if (relatedId && !visited.has(relatedId)) {
                                visited.add(relatedId);
                                visibleIds.add(relatedId);
                                queue.push({ id: relatedId, hopDepth: currentHopDepth + 1 });
                            }
                        }
                    }
                }
                // Case 2: Cross-entity relations
                else {
                    // Check if current entity is member 0
                    const records1 = await manifestCrudService.getMany(relationName, {
                        [member0.key]: currentEntityId,
                    });
                    if (Array.isArray(records1)) {
                        for (const record of records1) {
                            const relatedId = record[member1.key];
                            if (relatedId && !visited.has(relatedId)) {
                                visited.add(relatedId);
                                visibleIds.add(relatedId);
                                queue.push({ id: relatedId, hopDepth: currentHopDepth + 1 });
                            }
                        }
                    }

                    // Check if current entity is member 1
                    const records2 = await manifestCrudService.getMany(relationName, {
                        [member1.key]: currentEntityId,
                    });
                    if (Array.isArray(records2)) {
                        for (const record of records2) {
                            const relatedId = record[member0.key];
                            if (relatedId && !visited.has(relatedId)) {
                                visited.add(relatedId);
                                visibleIds.add(relatedId);
                                queue.push({ id: relatedId, hopDepth: currentHopDepth + 1 });
                            }
                        }
                    }
                }
            } catch (error) {
                // If query fails for a relation, continue to next relation
                continue;
            }
        }
    }

    return visibleIds;
}

/**
 * Get all entities related to a list of anchored characters
 *
 * Queries the database to find entities that have relations with the given anchored character IDs.
 * Used to expand list results so players can see entities they're related to.
 * Handles both cross-entity relations (Character <-> Place) and self-relations (Character <-> Character).
 *
 * @param {object} manifestCrudService - the CRUD service for database access
 * @param {string} entityRoute - the entity route (e.g., 'characters', 'places')
 * @param {string[]} anchoredCharacterIds - list of anchored character IDs for this user
 * @returns {Promise<string[]>} array of related entity IDs
 */
async function getRelatedEntityIds(manifestCrudService, entityRoute, anchoredCharacterIds = []) {
    if (!anchoredCharacterIds || anchoredCharacterIds.length === 0) {
        return [];
    }

    const entityName = getEntityNameByRoute(entityRoute);
    if (!entityName) {
        return [];
    }

    const relatedIds = new Set();

    // Check all relations in the manifest
    for (const [relationName, relationDef] of Object.entries(domainManifest.relations)) {
        if (!relationDef.members || relationDef.members.length < 2) {
            continue;
        }

        // Find all indices where this relation involves our entity type
        const entityMemberIndices = [];
        for (let i = 0; i < relationDef.members.length; i++) {
            if (relationDef.members[i].entity === entityName) {
                entityMemberIndices.push(i);
            }
        }

        // If this relation doesn't involve our entity type, skip it
        if (entityMemberIndices.length === 0) {
            continue;
        }

        // Case 1: Self-relation where both members are the same entity type (e.g., CharacterRelationship)
        if (entityMemberIndices.length === 2) {
            const member0 = relationDef.members[0];
            const member1 = relationDef.members[1];

            // Query in both directions to find all related entities
            for (const anchoredCharacterId of anchoredCharacterIds) {
                try {
                    // Direction 1: anchored char is member 0, get member 1
                    const records1 = await manifestCrudService.getMany(relationName, {
                        [member0.key]: anchoredCharacterId,
                    });
                    if (Array.isArray(records1)) {
                        for (const record of records1) {
                            const relatedId = record[member1.key];
                            if (relatedId) {
                                relatedIds.add(relatedId);
                            }
                        }
                    }

                    // Direction 2: anchored char is member 1, get member 0
                    const records2 = await manifestCrudService.getMany(relationName, {
                        [member1.key]: anchoredCharacterId,
                    });
                    if (Array.isArray(records2)) {
                        for (const record of records2) {
                            const relatedId = record[member0.key];
                            if (relatedId) {
                                relatedIds.add(relatedId);
                            }
                        }
                    }
                } catch (error) {
                    // If query fails, continue to next relation
                    continue;
                }
            }
        }
        // Case 2: Cross-entity relation where one member is our entity and the other is different
        else if (entityMemberIndices.length === 1) {
            const entityMemberIndex = entityMemberIndices[0];
            const otherMemberIndex = 1 - entityMemberIndex;
            const entityMember = relationDef.members[entityMemberIndex];
            const otherMember = relationDef.members[otherMemberIndex];

            // Query for all relations where the other member is an anchored character
            for (const anchoredCharacterId of anchoredCharacterIds) {
                try {
                    const records = await manifestCrudService.getMany(relationName, {
                        [otherMember.key]: anchoredCharacterId,
                    });
                    if (Array.isArray(records)) {
                        for (const record of records) {
                            const relatedId = record[entityMember.key];
                            if (relatedId) {
                                relatedIds.add(relatedId);
                            }
                        }
                    }
                } catch (error) {
                    // If query fails, continue to next relation
                    continue;
                }
            }
        }
    }

    return Array.from(relatedIds);
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
    isEntityRelatedToAnchoredCharacter,
    getRelatedEntityIds,
    getVisibleEntityIdsForUser,
};
