const express = require('express');
const { domainManifest } = require('../../common/domainManifest');
const { manifestCrudService } = require('../data/genericCrudService');
const { listAnchoredCharacterIdsByUserId } = require('../data/authRepository');
const {
    coerceValueByType,
    getEntityByRoute,
    getRelationMembers,
    getRelationByRoutes,
    conformObjectToEntity,
    omitKeys,
    dedupeRows,
    getRelationContext,
    getRelatedIdForRow,
    getRelationsForEntityRoute,
} = require('../utils/manifestHelpers');
const {
    getRelatedMemberInfo,
    normalizeRelationPayload,
    normalizeRelationUpdatePayload,
    getValidatedHistorySelector,
    buildRelationInsertData,
    buildRelationWhere,
    validateHistoryChronology,
} = require('../utils/relationWriteHelpers');
const {
    isEntityVisibleToUser,
    isRelationVisibleToUser,
    filterEntitiesByVisibility,
    filterRelationsByVisibility,
    isEntityRelatedToAnchoredCharacter,
    getRelatedEntityIds,
} = require('../utils/visibilityHelpers');

const router = express.Router();

async function loadAssociatedRecords(relationName, relationDef, sourceId, anchorMemberIndex, user, anchoredCharacterIds) {
    const members = getRelationMembers(relationDef);
    const relationContext = getRelationContext(members, anchorMemberIndex);
    const relationRows = await loadRelationRows(relationName, relationContext, sourceId);

    if (relationRows.length === 0) {
        return [];
    }

    const targetInfo = getTargetInfo(relationContext.relatedMember);
    const targetIds = collectTargetIds(relationRows, members, sourceId, anchorMemberIndex);
    const targetById = await loadTargetMap(targetInfo, targetIds);
    const memberKeys = members.map((member) => member.key);

    // Filter relations by visibility - check both member entities
    let visibleRows = relationRows;
    if (user && user.role !== 'dm') {
        // Load source entity once
        const sourceEntityDef = domainManifest.entities[members[anchorMemberIndex].entity];
        const sourceRoute = sourceEntityDef.route;
        const sourceEntity = await manifestCrudService.getOne(
            members[anchorMemberIndex].entity,
            { [sourceEntityDef.idField]: sourceId }
        );

        visibleRows = [];
        for (const row of relationRows) {
            // Get the target entity
            const targetId = getRelatedIdForRow(row, members, sourceId, anchorMemberIndex);
            const targetEntity = targetById.get(targetId);

            // Check if both members are visible
            if (sourceEntity && targetEntity) {
                const memberEntities = anchorMemberIndex === 0
                    ? [sourceEntity, targetEntity]
                    : [targetEntity, sourceEntity];
                if (isRelationVisibleToUser(relationName, memberEntities, user, anchoredCharacterIds)) {
                    visibleRows.push(row);
                }
            }
        }
    }

    if (relationDef.kind === 'simple') {
        return buildSimpleResults(
            visibleRows.map(row => getRelatedIdForRow(row, members, sourceId, anchorMemberIndex)),
            targetById
        );
    }

    if (relationDef.kind === 'relationship') {
        return buildRelationshipResults(visibleRows, targetById, members, memberKeys, sourceId, anchorMemberIndex);
    }

    if (relationDef.kind === 'history') {
        const visibleTargetIds = visibleRows
            .map(row => getRelatedIdForRow(row, members, sourceId, anchorMemberIndex))
            .filter((id, index, arr) => arr.indexOf(id) === index);
        return buildHistoryResults(visibleTargetIds, visibleRows, targetById, members, memberKeys, sourceId, anchorMemberIndex);
    }

    return visibleRows;
}

function getFullRelationsForEntityRoute(entityRoute) {
    return getRelationsForEntityRoute(entityRoute, domainManifest);
}

function buildRelationWhereCandidates({
    members,
    anchorMemberIndex,
    sourceId,
    relatedId,
    relationDef,
    historyValue,
}) {
    const where = buildRelationWhere({
        members,
        anchorMemberIndex,
        sourceId,
        relatedId,
        relationDef,
        historyValue,
    });

    const relatedMemberIndex = anchorMemberIndex === 0 ? 1 : 0;
    const isSelfRelation = members[anchorMemberIndex].entity === members[relatedMemberIndex].entity;

    // For directional relations (e.g., CharacterRelationship), only query the forward direction
    // If marked as directional or if not a self-relation, return only the forward WHERE clause
    if (!isSelfRelation || sourceId === relatedId || relationDef.directional) {
        return [where];
    }

    const reverseWhere = buildRelationWhere({
        members,
        anchorMemberIndex,
        sourceId: relatedId,
        relatedId: sourceId,
        relationDef,
        historyValue,
    });

    return [where, reverseWhere];
}

async function getFirstRelationRecordByWhereCandidates(relationName, whereCandidates) {
    for (const where of whereCandidates) {
        const record = await manifestCrudService.getOne(relationName, where);
        if (record) {
            return record;
        }
    }

    return null;
}

async function getAllRelationRecordsByWhereCandidates(relationName, whereCandidates) {
    if (whereCandidates.length === 1) {
        return manifestCrudService.getMany(relationName, whereCandidates[0]);
    }

    const rows = await Promise.all(
        whereCandidates.map((where) => manifestCrudService.getMany(relationName, where))
    );

    return dedupeRows(rows.flat());
}

async function updateFirstRelationRecordByWhereCandidates(relationName, whereCandidates, updates) {
    for (const where of whereCandidates) {
        const result = await manifestCrudService.update(relationName, where, updates);
        if (result.updated > 0 || result.record) {
            return result;
        }
    }

    return {
        updated: 0,
        record: null,
    };
}

async function removeFirstRelationRecordByWhereCandidates(relationName, whereCandidates) {
    for (const where of whereCandidates) {
        const result = await manifestCrudService.remove(relationName, where);
        if (result.deleted > 0) {
            return result;
        }
    }

    return {
        deleted: 0,
    };
}

async function loadRelationRows(relationName, relationContext, sourceId) {
    const { anchorMember, relatedMember } = relationContext;

    // For directional relations (e.g., CharacterRelationship), only query from the anchor member's perspective
    // If both members are the same entity type and the relation is marked as directional,
    // only return records where sourceId is in the anchor_key position
    return manifestCrudService.getMany(relationName, {
        [anchorMember.key]: sourceId,
    });
}

function getTargetInfo(relatedMember) {
    const targetEntityDef = domainManifest.entities[relatedMember.entity];

    return {
        entityName: relatedMember.entity,
        idField: targetEntityDef.idField,
    };
}

function collectTargetIds(relationRows, members, sourceId, anchorMemberIndex) {
    const seenIds = new Set();
    const ids = [];

    for (const row of relationRows) {
        const targetId = getRelatedIdForRow(row, members, sourceId, anchorMemberIndex);
        if (targetId === null || targetId === undefined) {
            continue;
        }

        if (seenIds.has(targetId)) {
            continue;
        }

        seenIds.add(targetId);
        ids.push(targetId);
    }

    return ids;
}

async function loadTargetMap(targetInfo, targetIds) {
    const targetById = new Map();

    for (const targetId of targetIds) {
        const target = await manifestCrudService.getOne(targetInfo.entityName, {
            [targetInfo.idField]: targetId,
        });

        if (target) {
            targetById.set(target[targetInfo.idField], target);
        }
    }

    return targetById;
}

function buildSimpleResults(targetIds, targetById) {
    const results = [];

    for (const targetId of targetIds) {
        const target = targetById.get(targetId);
        if (target) {
            results.push(target);
        }
    }

    return results;
}

function buildRelationshipResults(relationRows, targetById, members, memberKeys, sourceId, anchorMemberIndex) {
    const results = [];

    for (const row of relationRows) {
        const targetId = getRelatedIdForRow(row, members, sourceId, anchorMemberIndex);
        const target = targetById.get(targetId);
        if (!target) {
            continue;
        }

        results.push({
            ...target,
            relationship: omitKeys(row, memberKeys),
        });
    }

    return results;
}

function buildHistoryResults(targetIds, relationRows, targetById, members, memberKeys, sourceId, anchorMemberIndex) {
    const results = [];

    for (const targetId of targetIds) {
        const target = targetById.get(targetId);
        if (!target) {
            continue;
        }

        const history = [];
        for (const row of relationRows) {
            const relatedId = getRelatedIdForRow(row, members, sourceId, anchorMemberIndex);
            if (relatedId === targetId) {
                history.push(omitKeys(row, memberKeys));
            }
        }

        results.push({
            ...target,
            history,
        });
    }

    return results;
}

function toHttpError(err) {
    const message = err && err.message ? err.message : 'Unexpected error';

    if (/Unknown entity route|Unknown related route/i.test(message)) {
        return { status: 404, message };
    }

    if (
        /Invalid number value|Invalid boolean value|Unknown field for route|Unknown field for relation|Unknown query field for relation|Missing required query field|Cannot update primary key field|Primary key updates are not allowed|Data must be an object|Invalid slug id format for field|Missing history start date value for chronology validation|Invalid history date format for field|History end date must be after history start date|Parent place does not exist|A place cannot be its own parent|Parent assignment would create a cycle/i.test(
            message
        )
    ) {
        return { status: 400, message };
    }

    if (err && err.code === 'SQLITE_CONSTRAINT') {
        return { status: 409, message };
    }

    return { status: 500, message };
}

async function validatePlaceParent(parentId, placeId = null) {
    if (parentId === undefined || parentId === null || parentId === '') {
        return;
    }

    if (parentId === placeId) {
        throw new Error('A place cannot be its own parent');
    }

    const visited = new Set();
    let currentId = parentId;

    while (currentId !== undefined && currentId !== null && currentId !== '') {
        if (visited.has(currentId)) {
            throw new Error('Parent assignment would create a cycle');
        }
        visited.add(currentId);

        const parent = await manifestCrudService.getOne('Place', { id: currentId });
        if (!parent) {
            throw new Error(`Parent place does not exist: ${currentId}`);
        }

        if (parent.id === placeId) {
            throw new Error('Parent assignment would create a cycle');
        }

        currentId = parent.parent_id;
    }
}

async function ensureRecordExists(entityName, idField, idValue) {
    const record = await manifestCrudService.getOne(entityName, {
        [idField]: idValue,
    });

    if (!record) {
        throw new Error('Record not found');
    }

    return record;
}

function getEntityLookup(params) {
    const { entityName, entityDef } = getEntityByRoute(params.entityRoute);
    const idField = entityDef.idField;
    const idMeta = entityDef.fields[idField];
    const idValue = coerceValueByType(idMeta.type, params.id);

    return {
        entityName,
        entityDef,
        idField,
        idValue,
    };
}

function isDm(auth) {
    return auth && auth.role === 'dm';
}

async function getAnchoredCharacterIds(req) {
    if (!req.auth || !req.auth.userId) {
        return [];
    }
    return listAnchoredCharacterIdsByUserId(req.auth.userId);
}

function ensureDmForMutation(req) {
    if (!req.auth) {
        return { status: 401, error: 'Unauthorized' };
    }

    if (isDm(req.auth)) {
        return null;
    }

    return { status: 403, error: 'Only dm users can modify canonical domain data' };
}

function getPlayerPatchRule(fieldDef) {
    if (!fieldDef || !fieldDef.access) {
        return null;
    }

    return fieldDef.access.playerPatch || null;
}

function isPlayer(auth) {
    return auth && auth.role === 'player';
}

function normalizeOwnershipRule(playerPatchRule) {
    if (!playerPatchRule || typeof playerPatchRule !== 'object') {
        return null;
    }

    return playerPatchRule.ownership || null;
}

async function getAnchoredCharacterIdSetForRequest(auth) {
    const anchoredIds = await listAnchoredCharacterIdsByUserId(auth.userId);
    return new Set(anchoredIds);
}

async function authorizeEntityPatch(req, entityName, entityDef, idValue, updates) {
    if (!req.auth) {
        return { status: 401, error: 'Unauthorized' };
    }

    if (isDm(req.auth)) {
        return null;
    }

    if (!isPlayer(req.auth)) {
        return { status: 403, error: 'Only dm and player users can patch domain resources' };
    }

    const updateKeys = Object.keys(updates || {});
    if (updateKeys.length === 0) {
        return { status: 403, error: 'No player-editable fields were provided' };
    }

    for (const key of updateKeys) {
        const fieldDef = entityDef.fields[key];
        const playerPatchRule = getPlayerPatchRule(fieldDef);
        if (!playerPatchRule) {
            return { status: 403, error: `Field is dm-only: ${key}` };
        }

        const ownershipRule = normalizeOwnershipRule(playerPatchRule);
        if (!ownershipRule) {
            continue;
        }

        if (ownershipRule.type !== 'anchored-character') {
            return { status: 403, error: `Unsupported ownership rule for field: ${key}` };
        }

        if (entityName !== 'Character') {
            return { status: 403, error: `Anchored player edits are not configured for entity: ${entityName}` };
        }

        const anchoredIds = await getAnchoredCharacterIdSetForRequest(req.auth);
        if (!anchoredIds.has(idValue)) {
            return { status: 403, error: 'Players may only patch anchored character records' };
        }
    }

    return null;
}

function getRelationMemberIdsByEntity(members, anchorMemberIndex, sourceId, relatedId, entityName) {
    return members
        .map((member, memberIndex) => {
            if (member.entity !== entityName) {
                return null;
            }

            return memberIndex === anchorMemberIndex ? sourceId : relatedId;
        })
        .filter((idValue) => idValue !== null && idValue !== undefined);
}

async function authorizeRelationPatch(req, relationDef, members, anchorMemberIndex, sourceId, relatedId, updates) {
    if (!req.auth) {
        return { status: 401, error: 'Unauthorized' };
    }

    if (isDm(req.auth)) {
        return null;
    }

    if (!isPlayer(req.auth)) {
        return { status: 403, error: 'Only dm and player users can patch domain resources' };
    }

    const updateKeys = Object.keys(updates || {});
    if (updateKeys.length === 0) {
        return { status: 403, error: 'No player-editable fields were provided' };
    }

    const anchoredIds = await getAnchoredCharacterIdSetForRequest(req.auth);

    for (const key of updateKeys) {
        const fieldDef = relationDef.payload && relationDef.payload[key];
        const playerPatchRule = getPlayerPatchRule(fieldDef);
        if (!playerPatchRule) {
            return { status: 403, error: `Field is dm-only: ${key}` };
        }

        const ownershipRule = normalizeOwnershipRule(playerPatchRule);
        if (!ownershipRule) {
            continue;
        }

        if (ownershipRule.type !== 'anchored-character') {
            return { status: 403, error: `Unsupported ownership rule for field: ${key}` };
        }

        const relationMemberEntity = ownershipRule.relationMemberEntity || 'Character';
        const relationEntityIds = getRelationMemberIdsByEntity(
            members,
            anchorMemberIndex,
            sourceId,
            relatedId,
            relationMemberEntity
        );

        if (relationEntityIds.length === 0) {
            return { status: 403, error: `No ${relationMemberEntity} member is available for anchored ownership checks` };
        }

        const hasAnchoredMember = relationEntityIds.some((relationEntityId) =>
            anchoredIds.has(relationEntityId)
        );

        if (!hasAnchoredMember) {
            return { status: 403, error: 'Players may only patch relation records tied to anchored characters' };
        }
    }

    return null;
}

/* BASIC ENTITY ROUTES */
// create entity
router.post('/:entityRoute', async (req, res) => {
    try {
        const authErr = ensureDmForMutation(req);
        if (authErr) {
            return res.status(authErr.status).json({ error: authErr.error });
        }

        const { entityName, entityDef } = getEntityByRoute(req.params.entityRoute);
        const validated = conformObjectToEntity(req.body, entityDef, {
            enforcePrimaryIdFormat: true,
        });
        if (entityName === 'Place') {
            await validatePlaceParent(validated.parent_id, validated.id);
        }
        const created = await manifestCrudService.insert(entityName, validated);
        res.status(201).json(created);
    } catch (err) {
        const httpErr = toHttpError(err);
        res.status(httpErr.status).json({ error: httpErr.message });
    }
});
// get all of this entity
router.get('/:entityRoute', async (req, res) => {
    try {
        const { entityName } = getEntityByRoute(req.params.entityRoute);
        const records = await manifestCrudService.getMany(entityName);

        // Filter records by visibility
        const anchoredCharacterIds = await getAnchoredCharacterIds(req);
        const visibleRecords = filterEntitiesByVisibility(
            records,
            req.params.entityRoute,
            req.auth,
            anchoredCharacterIds
        );

        // For players, also include entities related to their anchored characters
        let resultRecords = visibleRecords;
        if (req.auth && req.auth.role === 'player' && anchoredCharacterIds.length > 0) {
            const relatedIds = await getRelatedEntityIds(
                manifestCrudService,
                req.params.entityRoute,
                anchoredCharacterIds
            );

            // Add related entities that aren't already in visible records
            if (relatedIds.length > 0) {
                const visibleIds = new Set(visibleRecords.map(r => r.id));
                const relatedRecords = records.filter(r => relatedIds.includes(r.id) && !visibleIds.has(r.id));
                resultRecords = [...visibleRecords, ...relatedRecords];
            }
        }

        return res.json(resultRecords);
    } catch (err) {
        const httpErr = toHttpError(err);
        return res.status(httpErr.status).json({ error: httpErr.message });
    }
});
// get one of this entity
router.get('/:entityRoute/:id', async (req, res) => {
    try {
        const { entityName, idField, idValue } = getEntityLookup(req.params);

        const record = await manifestCrudService.getOne(entityName, {
            [idField]: idValue,
        });

        if (!record) {
            return res.status(404).json({ error: 'Record not found' });
        }

        // Check visibility
        const anchoredCharacterIds = await getAnchoredCharacterIds(req);
        let isVisible = isEntityVisibleToUser(record, req.params.entityRoute, req.auth, anchoredCharacterIds);

        // For players, also check if the entity is related to their anchored characters
        if (!isVisible && req.auth && req.auth.role === 'player' && anchoredCharacterIds.length > 0) {
            isVisible = await isEntityRelatedToAnchoredCharacter(
                manifestCrudService,
                req.params.entityRoute,
                idValue,
                anchoredCharacterIds
            );
        }

        if (!isVisible) {
            return res.status(404).json({ error: 'Record not found' });
        }

        return res.json(record);
    } catch (err) {
        const httpErr = toHttpError(err);
        return res.status(httpErr.status).json({ error: httpErr.message });
    }
});
// edit this entity
router.patch('/:entityRoute/:id', async (req, res) => {
    try {
        const { entityName, entityDef, idField, idValue } = getEntityLookup(req.params);
        const updates = conformObjectToEntity(req.body, entityDef);
        if (entityName === 'Place' && Object.prototype.hasOwnProperty.call(updates, 'parent_id')) {
            await validatePlaceParent(updates.parent_id, idValue);
        }
        const authErr = await authorizeEntityPatch(req, entityName, entityDef, idValue, updates);
        if (authErr) {
            return res.status(authErr.status).json({ error: authErr.error });
        }

        const result = await manifestCrudService.update(entityName, {
            [idField]: idValue,
        }, updates);

        if (result.updated === 0 && !result.record) {
            return res.status(404).json({ error: 'Record not found' });
        }

        return res.json(result);
    } catch (err) {
        const httpErr = toHttpError(err);
        return res.status(httpErr.status).json({ error: httpErr.message });
    }
});
// delete this entity
router.delete('/:entityRoute/:id', async (req, res) => {
    try {
        const authErr = ensureDmForMutation(req);
        if (authErr) {
            return res.status(authErr.status).json({ error: authErr.error });
        }

        const { entityName, idField, idValue } = getEntityLookup(req.params);
        const result = await manifestCrudService.remove(entityName, {
            [idField]: idValue,
        });

        if (result.deleted === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }

        return res.json(result);
    } catch (err) {
        const httpErr = toHttpError(err);
        return res.status(httpErr.status).json({ error: httpErr.message });
    }
});

/* RELATIONAL ROUTES */
// create relation between these two entities
router.post('/:entityRoute/:id/:relatedRoute', async (req, res) => {
    try {
        const authErr = ensureDmForMutation(req);
        if (authErr) {
            return res.status(authErr.status).json({ error: authErr.error });
        }

        const { entityName, entityDef } = getEntityByRoute(req.params.entityRoute);
        const { relationName, relationDef, anchorMemberIndex } = getRelationByRoutes(
            req.params.entityRoute,
            req.params.relatedRoute
        );

        const sourceIdField = entityDef.idField;
        const sourceIdMeta = entityDef.fields[sourceIdField];
        const sourceId = coerceValueByType(sourceIdMeta.type, req.params.id);

        await ensureRecordExists(entityName, sourceIdField, sourceId);

        const { members, relatedEntityDef } = getRelatedMemberInfo(relationDef, anchorMemberIndex);
        const relatedIdField = relatedEntityDef.idField;
        const relatedIdMeta = relatedEntityDef.fields[relatedIdField];
        const relatedId = coerceValueByType(relatedIdMeta.type, req.body && req.body.id);

        if (relatedId === undefined || relatedId === null) {
            return res.status(400).json({ error: 'Missing required field: id' });
        }

        await ensureRecordExists(
            members[anchorMemberIndex === 0 ? 1 : 0].entity,
            relatedIdField,
            relatedId
        );

        const { id: _, ...rawPayload } = req.body || {};
        const payload = normalizeRelationPayload(rawPayload, relationDef);
        validateHistoryChronology({
            relationDef,
            startValue: relationDef.historyKey ? payload[relationDef.historyKey] : undefined,
            endValue: relationDef.historyEndKey ? payload[relationDef.historyEndKey] : undefined,
        });
        const relationData = buildRelationInsertData({
            relationDef,
            members,
            anchorMemberIndex,
            sourceId,
            relatedId,
            payload,
        });

        const created = await manifestCrudService.insert(relationName, relationData);
        return res.status(201).json(created);
    } catch (err) {
        if (err && err.message === 'Record not found') {
            return res.status(404).json({ error: 'Record not found' });
        }

        const httpErr = toHttpError(err);
        return res.status(httpErr.status).json({ error: httpErr.message });
    }
});

router.get('/:entityRoute/:id/full', async (req, res) => {
    try {
        const { entityName, idField, idValue } = getEntityLookup(req.params);

        const record = await manifestCrudService.getOne(entityName, {
            [idField]: idValue,
        });

        if (!record) {
            return res.status(404).json({ error: 'Record not found' });
        }

        // Check visibility of the main entity
        const anchoredCharacterIds = await getAnchoredCharacterIds(req);
        let isVisible = isEntityVisibleToUser(record, req.params.entityRoute, req.auth, anchoredCharacterIds);

        // For players, also check if the entity is related to their anchored characters
        if (!isVisible && req.auth && req.auth.role === 'player' && anchoredCharacterIds.length > 0) {
            isVisible = await isEntityRelatedToAnchoredCharacter(
                manifestCrudService,
                req.params.entityRoute,
                idValue,
                anchoredCharacterIds
            );
        }

        if (!isVisible) {
            return res.status(404).json({ error: 'Record not found' });
        }

        const related = {};
        const children = entityName === 'Place'
            ? await manifestCrudService.getMany('Place', { parent_id: idValue })
            : undefined;
        const relations = getFullRelationsForEntityRoute(req.params.entityRoute);

        for (const relation of relations) {
            related[relation.relatedRoute] = await loadAssociatedRecords(
                relation.relationName,
                relation.relationDef,
                idValue,
                relation.anchorMemberIndex,
                req.auth,
                anchoredCharacterIds
            );
        }

        const response = {
            entity: record,
            related,
        };

        if (children) {
            response.children = children;
        }

        return res.json(response);
    } catch (err) {
        const httpErr = toHttpError(err);
        return res.status(httpErr.status).json({ error: httpErr.message });
    }
});

// get all of this type of entity related to this specific entity
router.get('/:entityRoute/:id/:relatedRoute', async (req, res) => {
    try {
        const { entityName, entityDef } = getEntityByRoute(req.params.entityRoute);
        const { relationName, relationDef, anchorMemberIndex } = getRelationByRoutes(
            req.params.entityRoute,
            req.params.relatedRoute
        );
        const idField = entityDef.idField;
        const idMeta = entityDef.fields[idField];
        const sourceId = coerceValueByType(idMeta.type, req.params.id);

        const sourceRecord = await manifestCrudService.getOne(entityName, {
            [idField]: sourceId,
        });

        if (!sourceRecord) {
            return res.status(404).json({ error: 'Record not found' });
        }

        // Check visibility of source entity
        const anchoredCharacterIds = await getAnchoredCharacterIds(req);
        if (!isEntityVisibleToUser(sourceRecord, req.params.entityRoute, req.auth, anchoredCharacterIds)) {
            return res.status(404).json({ error: 'Record not found' });
        }

        const records = await loadAssociatedRecords(
            relationName,
            relationDef,
            sourceId,
            anchorMemberIndex,
            req.auth,
            anchoredCharacterIds
        );
        return res.json(records);
    } catch (err) {
        const httpErr = toHttpError(err);
        return res.status(httpErr.status).json({ error: httpErr.message });
    }
});

// get this one specific related entity
router.get('/:entityRoute/:id/:relatedRoute/:relatedId', async (req, res) => {
    try {
        const { relationName, relationDef, anchorMemberIndex, relatedMemberIndex } = getRelationByRoutes(
            req.params.entityRoute,
            req.params.relatedRoute
        );
        const members = getRelationMembers(relationDef);

        const sourceMember = members[anchorMemberIndex];
        const relatedMember = members[relatedMemberIndex];
        const sourceIdField = sourceMember.key;
        const relatedIdField = relatedMember.key;

        const sourceEntityDef = domainManifest.entities[sourceMember.entity];
        const relatedEntityDef = domainManifest.entities[relatedMember.entity];

        const sourceEntityIdField = sourceEntityDef.idField;
        const sourceIdMeta = sourceEntityDef.fields[sourceEntityIdField];
        const sourceId = coerceValueByType(sourceIdMeta.type, req.params.id);

        const relatedEntityIdField = relatedEntityDef.idField;
        const relatedIdMeta = relatedEntityDef.fields[relatedEntityIdField];
        const relatedId = coerceValueByType(relatedIdMeta.type, req.params.relatedId);

        const whereCandidates = buildRelationWhereCandidates({
            members,
            anchorMemberIndex,
            sourceId,
            relatedId,
            relationDef,
        });

        // Get anchored character IDs for visibility checking
        const anchoredCharacterIds = await getAnchoredCharacterIds(req);

        let sourceEntity = null;
        let relatedEntity = null;
        const shouldCheckRelationVisibility = !!req.auth && req.auth.role !== 'dm';

        if (shouldCheckRelationVisibility) {
            // Load member entities for visibility checking
            sourceEntity = await manifestCrudService.getOne(sourceMember.entity, {
                [sourceEntityIdField]: sourceId,
            });
            relatedEntity = await manifestCrudService.getOne(relatedMember.entity, {
                [relatedEntityIdField]: relatedId,
            });
        }

        if (relationDef.kind === 'history' && relationDef.historyKey) {
            const historyValue = getValidatedHistorySelector(req.query, relationDef, { required: false });
            if (historyValue !== undefined) {
                const historyWhereCandidates = buildRelationWhereCandidates({
                    members,
                    anchorMemberIndex,
                    sourceId,
                    relatedId,
                    relationDef,
                    historyValue,
                });
                const record = await getFirstRelationRecordByWhereCandidates(
                    relationName,
                    historyWhereCandidates
                );
                if (!record) {
                    return res.status(404).json({ error: 'Record not found' });
                }

                if (shouldCheckRelationVisibility) {
                    const memberEntities = [sourceEntity, relatedEntity];
                    if (!isRelationVisibleToUser(relationName, memberEntities, req.auth, anchoredCharacterIds)) {
                        return res.status(404).json({ error: 'Record not found' });
                    }
                }

                return res.json(record);
            }

            const records = await getAllRelationRecordsByWhereCandidates(relationName, whereCandidates);
            if (records.length === 0) {
                return res.status(404).json({ error: 'Record not found' });
            }

            if (shouldCheckRelationVisibility) {
                const memberEntities = [sourceEntity, relatedEntity];
                if (!isRelationVisibleToUser(relationName, memberEntities, req.auth, anchoredCharacterIds)) {
                    return res.status(404).json({ error: 'Record not found' });
                }
            }

            return res.json(records);
        }

        const record = await getFirstRelationRecordByWhereCandidates(relationName, whereCandidates);
        if (!record) {
            return res.status(404).json({ error: 'Record not found' });
        }

        if (shouldCheckRelationVisibility) {
            const memberEntities = [sourceEntity, relatedEntity];
            if (!isRelationVisibleToUser(relationName, memberEntities, req.auth, anchoredCharacterIds)) {
                return res.status(404).json({ error: 'Record not found' });
            }
        }

        return res.json(record);
    } catch (err) {
        const httpErr = toHttpError(err);
        return res.status(httpErr.status).json({ error: httpErr.message });
    }
});

// update this one specific relation between these entities
router.patch('/:entityRoute/:id/:relatedRoute/:relatedId', async (req, res) => {
    try {
        const { entityName, entityDef } = getEntityByRoute(req.params.entityRoute);
        const { relationName, relationDef, anchorMemberIndex } = getRelationByRoutes(
            req.params.entityRoute,
            req.params.relatedRoute
        );
        const members = getRelationMembers(relationDef);
        const { relatedEntityDef } = getRelatedMemberInfo(relationDef, anchorMemberIndex);

        const sourceIdField = entityDef.idField;
        const sourceIdMeta = entityDef.fields[sourceIdField];
        const sourceId = coerceValueByType(sourceIdMeta.type, req.params.id);

        const relatedIdField = relatedEntityDef.idField;
        const relatedIdMeta = relatedEntityDef.fields[relatedIdField];
        const relatedId = coerceValueByType(relatedIdMeta.type, req.params.relatedId);

        await ensureRecordExists(entityName, sourceIdField, sourceId);
        await ensureRecordExists(
            members[anchorMemberIndex === 0 ? 1 : 0].entity,
            relatedIdField,
            relatedId
        );

        let historyValue;
        if (relationDef.kind === 'history' && relationDef.historyKey) {
            historyValue = getValidatedHistorySelector(req.query, relationDef, { required: true });
        }

        const updates = normalizeRelationUpdatePayload(req.body, relationDef);
        if (
            relationDef.kind === 'history' &&
            relationDef.historyEndKey &&
            Object.prototype.hasOwnProperty.call(updates, relationDef.historyEndKey)
        ) {
            validateHistoryChronology({
                relationDef,
                startValue: historyValue,
                endValue: updates[relationDef.historyEndKey],
            });
        }
        const authErr = await authorizeRelationPatch(
            req,
            relationDef,
            members,
            anchorMemberIndex,
            sourceId,
            relatedId,
            updates
        );
        if (authErr) {
            return res.status(authErr.status).json({ error: authErr.error });
        }

        const whereCandidates = buildRelationWhereCandidates({
            members,
            anchorMemberIndex,
            sourceId,
            relatedId,
            relationDef,
            historyValue,
        });

        const result = await updateFirstRelationRecordByWhereCandidates(
            relationName,
            whereCandidates,
            updates
        );

        if (result.updated === 0 && !result.record) {
            return res.status(404).json({ error: 'Record not found' });
        }

        return res.json(result);
    } catch (err) {
        if (err && err.message === 'Record not found') {
            return res.status(404).json({ error: 'Record not found' });
        }

        const httpErr = toHttpError(err);
        return res.status(httpErr.status).json({ error: httpErr.message });
    }
});

// delete this relationship
router.delete('/:entityRoute/:id/:relatedRoute/:relatedId', async (req, res) => {
    try {
        const authErr = ensureDmForMutation(req);
        if (authErr) {
            return res.status(authErr.status).json({ error: authErr.error });
        }

        const { entityName, entityDef } = getEntityByRoute(req.params.entityRoute);
        const { relationName, relationDef, anchorMemberIndex } = getRelationByRoutes(
            req.params.entityRoute,
            req.params.relatedRoute
        );
        const members = getRelationMembers(relationDef);
        const { relatedEntityDef } = getRelatedMemberInfo(relationDef, anchorMemberIndex);

        const sourceIdField = entityDef.idField;
        const sourceIdMeta = entityDef.fields[sourceIdField];
        const sourceId = coerceValueByType(sourceIdMeta.type, req.params.id);

        const relatedIdField = relatedEntityDef.idField;
        const relatedIdMeta = relatedEntityDef.fields[relatedIdField];
        const relatedId = coerceValueByType(relatedIdMeta.type, req.params.relatedId);

        await ensureRecordExists(entityName, sourceIdField, sourceId);
        await ensureRecordExists(
            members[anchorMemberIndex === 0 ? 1 : 0].entity,
            relatedIdField,
            relatedId
        );

        let historyValue;
        if (relationDef.kind === 'history' && relationDef.historyKey) {
            historyValue = getValidatedHistorySelector(req.query, relationDef, { required: true });
        }

        const whereCandidates = buildRelationWhereCandidates({
            members,
            anchorMemberIndex,
            sourceId,
            relatedId,
            relationDef,
            historyValue,
        });

        const result = await removeFirstRelationRecordByWhereCandidates(relationName, whereCandidates);

        if (result.deleted === 0) {
            return res.status(404).json({ error: 'Record not found' });
        }

        return res.json(result);
    } catch (err) {
        if (err && err.message === 'Record not found') {
            return res.status(404).json({ error: 'Record not found' });
        }

        const httpErr = toHttpError(err);
        return res.status(httpErr.status).json({ error: httpErr.message });
    }
});


module.exports = router;