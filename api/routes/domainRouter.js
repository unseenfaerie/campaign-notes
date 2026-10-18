const express = require('express');
const { domainManifest } = require('../../common/domainManifest');
const { manifestCrudService } = require('../data/genericCrudService');
const { findUserById } = require('../data/authRepository');
const { resolveViewingCharacterId, getVisibilityAuth } = require('../utils/viewingCharacterHelpers');
const {
    createProposal,
    getPendingProposalForTarget,
    getPendingProposals,
    getPendingProposalsForResource,
    getProposalById,
    markAccepted,
    markRejected,
} = require('../data/editProposalRepository');
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
    stableStringify,
    buildEntityTargetKey,
    filterProposableChanges,
    diffAgainstCurrent,
} = require('../utils/proposalHelpers');
const {
    getVisibilityHopsForCharacter,
    isEntityVisibleToUser,
    isRelationVisibleToUser,
    filterEntitiesByVisibility,
    filterRelationsByVisibility,
    getRelatedEntityIds,
    getVisibleEntityIdsForUser,
    resolveEntityAccess,
    isTargetEntityLocked,
    buildLockedEntityStub,
} = require('../utils/visibilityHelpers');

const router = express.Router();

async function loadAssociatedRecords(relationName, relationDef, sourceId, anchorMemberIndex, user, anchoredCharacterIds, visibleEntityHops, maxHops, relatedRoute) {
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

    // Targets at the outer edge of the viewer's visibility graph render as name-only stubs.
    const lockedTargetIds = new Set();
    for (const [targetId, target] of targetById.entries()) {
        if (isTargetEntityLocked(target, relatedRoute, user, anchoredCharacterIds, visibleEntityHops, maxHops)) {
            lockedTargetIds.add(targetId);
        }
    }

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
                // Fall back to the transitive graph: both members reachable there means the
                // relation connecting them should show too, even if neither is directly anchored.
                const transitivelyVisible = !!visibleEntityHops
                    && visibleEntityHops.has(sourceEntity.id)
                    && visibleEntityHops.has(targetEntity.id);
                if (isRelationVisibleToUser(relationName, memberEntities, user, anchoredCharacterIds) || transitivelyVisible) {
                    visibleRows.push(row);
                }
            }
        }
    }

    if (relationDef.kind === 'simple') {
        return buildSimpleResults(
            visibleRows.map(row => getRelatedIdForRow(row, members, sourceId, anchorMemberIndex)),
            targetById,
            relatedRoute,
            lockedTargetIds
        );
    }

    // Simple relations have no payload fields, so nothing to propose/lock there.
    const pendingProposals = await getPendingProposalsForResource(relationName);
    const proposalByKey = new Map(pendingProposals.map((proposal) => [stableStringify(proposal.target_key), proposal]));

    if (relationDef.kind === 'relationship') {
        return buildRelationshipResults(visibleRows, targetById, members, memberKeys, sourceId, anchorMemberIndex, relationDef, proposalByKey, relatedRoute, lockedTargetIds);
    }

    if (relationDef.kind === 'history') {
        const visibleTargetIds = visibleRows
            .map(row => getRelatedIdForRow(row, members, sourceId, anchorMemberIndex))
            .filter((id, index, arr) => arr.indexOf(id) === index);
        return buildHistoryResults(visibleTargetIds, visibleRows, targetById, members, memberKeys, sourceId, anchorMemberIndex, relationDef, proposalByKey, relatedRoute, lockedTargetIds);
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

async function updateFirstRelationRecordByWhereCandidates(relationName, whereCandidates, updates, options) {
    for (const where of whereCandidates) {
        const result = await manifestCrudService.update(relationName, where, updates, options);
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

function buildSimpleResults(targetIds, targetById, relatedRoute, lockedTargetIds) {
    const results = [];

    for (const targetId of targetIds) {
        const target = targetById.get(targetId);
        if (target) {
            results.push(lockedTargetIds.has(targetId) ? buildLockedEntityStub(target, relatedRoute) : target);
        }
    }

    return results;
}

async function buildRelationshipResults(relationRows, targetById, members, memberKeys, sourceId, anchorMemberIndex, relationDef, proposalByKey, relatedRoute, lockedTargetIds) {
    const results = [];

    for (const row of relationRows) {
        const targetId = getRelatedIdForRow(row, members, sourceId, anchorMemberIndex);
        const target = targetById.get(targetId);
        if (!target) {
            continue;
        }

        if (lockedTargetIds.has(targetId)) {
            results.push(buildLockedEntityStub(target, relatedRoute));
            continue;
        }

        const targetKey = buildRelationWhere({ members, anchorMemberIndex, sourceId, relatedId: targetId, relationDef });
        const pendingProposal = await toProposalView(proposalByKey.get(stableStringify(targetKey)) || null);

        results.push({
            ...target,
            relationship: { ...omitKeys(row, memberKeys), pendingProposal },
        });
    }

    return results;
}

async function buildHistoryResults(targetIds, relationRows, targetById, members, memberKeys, sourceId, anchorMemberIndex, relationDef, proposalByKey, relatedRoute, lockedTargetIds) {
    const results = [];

    for (const targetId of targetIds) {
        const target = targetById.get(targetId);
        if (!target) {
            continue;
        }

        if (lockedTargetIds.has(targetId)) {
            results.push(buildLockedEntityStub(target, relatedRoute));
            continue;
        }

        const history = [];
        for (const row of relationRows) {
            const relatedId = getRelatedIdForRow(row, members, sourceId, anchorMemberIndex);
            if (relatedId === targetId) {
                const targetKey = buildRelationWhere({
                    members,
                    anchorMemberIndex,
                    sourceId,
                    relatedId,
                    relationDef,
                    historyValue: relationDef.historyKey ? row[relationDef.historyKey] : undefined,
                });
                const pendingProposal = await toProposalView(proposalByKey.get(stableStringify(targetKey)) || null);
                history.push({ ...omitKeys(row, memberKeys), pendingProposal });
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
        /Invalid number value|Invalid boolean value|Unknown field for route|Unknown field for relation|Unknown query field for relation|Missing required query field|Cannot update primary key field|Primary key updates are not allowed|Data must be an object|Invalid slug id format for field|Missing history start date value for chronology validation|Invalid history date format for field|History end date must be after history start date|Parent place does not exist|A place cannot be its own parent|Parent assignment would create a cycle|Unknown field for proposal|Cannot propose changes to primary key field|Field is not player-proposable|No proposed changes differ from the current record|This relation type has no editable fields/i.test(
            message
        )
    ) {
        return { status: 400, message };
    }

    if (/A pending edit proposal exists for this record|Proposal is not pending/i.test(message)) {
        return { status: 409, message };
    }

    if (/^Proposal not found$/i.test(message)) {
        return { status: 404, message };
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

function ensurePlayerForProposal(req) {
    if (!req.auth) {
        return { status: 401, error: 'Unauthorized' };
    }

    if (req.auth.role !== 'player') {
        return { status: 403, error: 'Only player users can propose edits' };
    }

    return null;
}

// Players may propose edits to anything they can see except other players' character
// records (and, transitively, relations that directly involve one of those characters).
function isForeignPlayerCharacter(entityName, record, anchoredCharacterIds) {
    return Boolean(
        entityName === 'Character' && record && record.player_character && !anchoredCharacterIds.includes(record.id)
    );
}

async function assertNoPendingProposal(resourceName, targetKey) {
    const pending = await getPendingProposalForTarget(resourceName, targetKey);
    if (pending) {
        throw new Error('A pending edit proposal exists for this record');
    }
}

async function toProposalView(proposal) {
    if (!proposal) {
        return null;
    }

    const proposer = await findUserById(proposal.proposed_by);

    return {
        id: proposal.id,
        proposedChanges: proposal.proposed_changes,
        baseSnapshot: proposal.base_snapshot,
        proposedById: proposal.proposed_by,
        proposedByUsername: proposer ? proposer.username : proposal.proposed_by,
        proposedAt: proposal.proposed_at,
    };
}

async function buildProposalTargetView(proposal) {
    if (!proposal) {
        return null;
    }

    if (proposal.target_kind === 'entity') {
        const entityDef = domainManifest.entities[proposal.resource_name];
        const targetKey = proposal.target_key || {};
        const targetId = targetKey[entityDef.idField] ?? targetKey.id;

        const entity = entityDef ? await manifestCrudService.getOne(proposal.resource_name, {
            [entityDef.idField]: targetId,
        }) : null;

        return {
            kind: 'entity',
            entities: [{
                entityRoute: entityDef ? entityDef.route : proposal.resource_name.toLowerCase() + 's',
                id: targetId,
                label: entity && entity.name ? entity.name : targetId,
            }],
        };
    }

    const relationDef = domainManifest.relations[proposal.resource_name];
    const relationMembers = relationDef ? relationDef.members : [];
    const entities = [];

    for (const member of relationMembers) {
        const memberEntityDef = domainManifest.entities[member.entity];
        const key = member.key;
        const targetId = proposal.target_key && proposal.target_key[key];

        if (targetId === undefined || targetId === null) {
            continue;
        }

        const memberRecord = await manifestCrudService.getOne(member.entity, {
            [memberEntityDef.idField]: targetId,
        });

        entities.push({
            entityRoute: memberEntityDef.route,
            id: targetId,
            label: memberRecord && memberRecord.name ? memberRecord.name : targetId,
        });
    }

    return {
        kind: 'relation',
        entities,
    };
}

// Resolves the single character (if any) this request is browsing as, for read-visibility only.
// Hop count is derived from that character's intelligence (see visibilityHelpers.js).
async function resolveVisibilityContext(req) {
    const viewingCharacterId = await resolveViewingCharacterId(req, manifestCrudService);
    const visibilityAuth = getVisibilityAuth(req.auth, viewingCharacterId);
    const viewingCharacterIds = viewingCharacterId ? [viewingCharacterId] : [];
    const viewingCharacterHops = await getVisibilityHopsForCharacter(manifestCrudService, viewingCharacterId);
    return { visibilityAuth, viewingCharacterIds, viewingCharacterHops };
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

router.get('/proposals', async (req, res) => {
    try {
        const authErr = ensureDmForMutation(req);
        if (authErr) {
            return res.status(authErr.status).json({ error: authErr.error });
        }

        const proposals = await getPendingProposals();
        const result = [];

        for (const proposal of proposals) {
            const proposalView = await toProposalView(proposal);
            result.push({
                ...proposalView,
                target: await buildProposalTargetView(proposal),
            });
        }

        return res.json(result);
    } catch (err) {
        const httpErr = toHttpError(err);
        return res.status(httpErr.status).json({ error: httpErr.message });
    }
});

/* BASIC ENTITY ROUTES */
// accept a pending proposal (DM-only): applies the proposed changes and credits the proposer.
// Registered before the wildcard /:entityRoute/:id/... routes below so '/proposals/:id/accept'
// (3 path segments) can't be misrouted to the generic 3-segment relation-create route.
router.post('/proposals/:proposalId/accept', async (req, res) => {
    try {
        const authErr = ensureDmForMutation(req);
        if (authErr) {
            return res.status(authErr.status).json({ error: authErr.error });
        }

        const proposal = await getProposalById(req.params.proposalId);
        if (!proposal) {
            return res.status(404).json({ error: 'Proposal not found' });
        }
        if (proposal.status !== 'pending') {
            return res.status(409).json({ error: 'Proposal is not pending' });
        }

        const proposer = await findUserById(proposal.proposed_by);
        await manifestCrudService.update(proposal.resource_name, proposal.target_key, proposal.proposed_changes, {
            actorUsername: proposer ? proposer.username : undefined,
        });

        const updated = await markAccepted(req.params.proposalId, {
            reviewedBy: req.auth.userId,
            reviewedAt: new Date().toISOString(),
        });

        return res.json(await toProposalView(updated));
    } catch (err) {
        const httpErr = toHttpError(err);
        return res.status(httpErr.status).json({ error: httpErr.message });
    }
});

// reject a pending proposal (DM-only): discards it and releases the record's lock
router.post('/proposals/:proposalId/reject', async (req, res) => {
    try {
        const authErr = ensureDmForMutation(req);
        if (authErr) {
            return res.status(authErr.status).json({ error: authErr.error });
        }

        const proposal = await getProposalById(req.params.proposalId);
        if (!proposal) {
            return res.status(404).json({ error: 'Proposal not found' });
        }
        if (proposal.status !== 'pending') {
            return res.status(409).json({ error: 'Proposal is not pending' });
        }

        const updated = await markRejected(req.params.proposalId, {
            reviewedBy: req.auth.userId,
            reviewedAt: new Date().toISOString(),
            reviewNote: req.body && req.body.note,
        });

        return res.json(await toProposalView(updated));
    } catch (err) {
        const httpErr = toHttpError(err);
        return res.status(httpErr.status).json({ error: httpErr.message });
    }
});

// revoke a pending proposal (author-only): discards it and releases the record's lock
router.post('/proposals/:proposalId/revoke', async (req, res) => {
    try {
        if (!req.auth) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const proposal = await getProposalById(req.params.proposalId);
        if (!proposal) {
            return res.status(404).json({ error: 'Proposal not found' });
        }
        if (proposal.status !== 'pending') {
            return res.status(409).json({ error: 'Proposal is not pending' });
        }
        if (proposal.proposed_by !== req.auth.userId) {
            return res.status(403).json({ error: 'Only the proposal author can revoke it' });
        }

        const updated = await markRejected(req.params.proposalId, {
            reviewedBy: req.auth.userId,
            reviewedAt: new Date().toISOString(),
            reviewNote: 'Revoked by author',
        });

        return res.json(await toProposalView(updated));
    } catch (err) {
        const httpErr = toHttpError(err);
        return res.status(httpErr.status).json({ error: httpErr.message });
    }
});

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
        const created = await manifestCrudService.insert(entityName, validated, { actorUsername: req.auth.username });
        res.status(201).json(created);
    } catch (err) {
        const httpErr = toHttpError(err);
        res.status(httpErr.status).json({ error: httpErr.message });
    }
});

// Special handler for filtering aliases by entity_type and entity_id
router.get('/aliases', async (req, res) => {
    try {
        let entity_type = req.query.entity_type;
        const entity_id = req.query.entity_id;

        // If entity_type looks like a route name (plural), convert it to the entity type (singular, lowercase)
        // e.g., 'characters' -> 'character', 'deities' -> 'deity'
        if (entity_type) {
            try {
                const { entityName } = getEntityByRoute(String(entity_type));
                entity_type = entityName.toLowerCase();
            } catch {
                // If it's not a valid route, use it as-is (might already be entity_type)
                entity_type = String(entity_type).toLowerCase();
            }
        }

        // If both filters are provided, apply them
        if (entity_type && entity_id) {
            const whereClause = {
                entity_type: String(entity_type),
                entity_id: String(entity_id),
            };
            const records = await manifestCrudService.getMany('Alias', whereClause);
            return res.json(records);
        }

        // Otherwise fail with clear error
        res.status(400).json({ error: 'Aliases endpoint requires entity_type and entity_id parameters' });
    } catch (err) {
        const httpErr = toHttpError(err);
        return res.status(httpErr.status).json({ error: httpErr.message });
    }
});

// get all of this entity
router.get('/:entityRoute', async (req, res) => {
    try {
        const { entityName } = getEntityByRoute(req.params.entityRoute);
        const records = await manifestCrudService.getMany(entityName);

        // Get visibility scope for this request (single viewing character, if any)
        const { visibilityAuth, viewingCharacterIds, viewingCharacterHops } = await resolveVisibilityContext(req);

        // Filter records: for players use transitive graph, for others use standard visibility
        let resultRecords;
        if (visibilityAuth && visibilityAuth.role === 'player' && viewingCharacterIds.length > 0) {
            // Compute full transitive visibility graph, then resolve each record to full/locked/hidden
            const visibleEntityHops = await getVisibleEntityIdsForUser(
                manifestCrudService,
                viewingCharacterIds,
                viewingCharacterHops
            );

            resultRecords = [];
            for (const record of records) {
                const access = resolveEntityAccess(record, req.params.entityRoute, visibilityAuth, viewingCharacterIds, visibleEntityHops, viewingCharacterHops);
                if (access === 'full') {
                    resultRecords.push(record);
                } else if (access === 'locked') {
                    resultRecords.push(buildLockedEntityStub(record, req.params.entityRoute));
                }
            }
        } else {
            // Use standard visibility filtering (DM sees all; unauthenticated users see public data).
            resultRecords = filterEntitiesByVisibility(
                records,
                req.params.entityRoute,
                visibilityAuth,
                viewingCharacterIds
            );
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
        const { visibilityAuth, viewingCharacterIds, viewingCharacterHops } = await resolveVisibilityContext(req);
        let access = isEntityVisibleToUser(record, req.params.entityRoute, visibilityAuth, viewingCharacterIds) ? 'full' : 'hidden';

        // For players (or DM previewing as a character), also check transitive visibility graph
        if (access === 'hidden' && visibilityAuth && visibilityAuth.role === 'player' && viewingCharacterIds.length > 0) {
            const visibleEntityHops = await getVisibleEntityIdsForUser(
                manifestCrudService,
                viewingCharacterIds,
                viewingCharacterHops
            );
            access = resolveEntityAccess(record, req.params.entityRoute, visibilityAuth, viewingCharacterIds, visibleEntityHops, viewingCharacterHops);
        }

        if (access === 'hidden') {
            return res.status(404).json({ error: 'Record not found' });
        }

        if (access === 'locked') {
            return res.json(buildLockedEntityStub(record, req.params.entityRoute));
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
        const authErr = ensureDmForMutation(req);
        if (authErr) {
            return res.status(authErr.status).json({ error: authErr.error });
        }

        const { entityName, entityDef, idField, idValue } = getEntityLookup(req.params);
        const updates = conformObjectToEntity(req.body, entityDef);
        if (entityName === 'Place' && Object.prototype.hasOwnProperty.call(updates, 'parent_id')) {
            await validatePlaceParent(updates.parent_id, idValue);
        }

        await assertNoPendingProposal(entityName, buildEntityTargetKey(idField, idValue));

        const result = await manifestCrudService.update(entityName, {
            [idField]: idValue,
        }, updates, { actorUsername: req.auth.username });

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
        await assertNoPendingProposal(entityName, buildEntityTargetKey(idField, idValue));
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

// propose a change to this entity (player-only; locks the record until a DM accepts/rejects)
router.post('/:entityRoute/:id/propose', async (req, res) => {
    try {
        const authErr = ensurePlayerForProposal(req);
        if (authErr) {
            return res.status(authErr.status).json({ error: authErr.error });
        }

        const { entityName, entityDef, idField, idValue } = getEntityLookup(req.params);
        const record = await manifestCrudService.getOne(entityName, { [idField]: idValue });
        if (!record) {
            return res.status(404).json({ error: 'Record not found' });
        }

        const { visibilityAuth, viewingCharacterIds, viewingCharacterHops } = await resolveVisibilityContext(req);
        let access = isEntityVisibleToUser(record, req.params.entityRoute, visibilityAuth, viewingCharacterIds) ? 'full' : 'hidden';
        if (access === 'hidden') {
            const visibleEntityHops = await getVisibleEntityIdsForUser(
                manifestCrudService,
                viewingCharacterIds,
                viewingCharacterHops
            );
            access = resolveEntityAccess(record, req.params.entityRoute, visibilityAuth, viewingCharacterIds, visibleEntityHops, viewingCharacterHops);
        }
        if (access === 'hidden') {
            return res.status(404).json({ error: 'Record not found' });
        }
        if (access === 'locked') {
            return res.status(403).json({ error: 'Cannot propose edits to a locked record' });
        }

        if (isForeignPlayerCharacter(entityName, record, viewingCharacterIds)) {
            return res.status(403).json({ error: "Cannot propose edits to another player's character" });
        }

        const targetKey = buildEntityTargetKey(idField, idValue);
        await assertNoPendingProposal(entityName, targetKey);

        const changes = filterProposableChanges(req.body, entityDef.fields);
        const diff = diffAgainstCurrent(changes, record);
        if (Object.keys(diff).length === 0) {
            return res.status(400).json({ error: 'No proposed changes differ from the current record' });
        }

        const proposal = await createProposal({
            targetKind: 'entity',
            resourceName: entityName,
            targetKey,
            baseSnapshot: record,
            proposedChanges: diff,
            proposedBy: req.auth.userId,
            proposedAt: new Date().toISOString(),
        });

        return res.status(201).json(await toProposalView(proposal));
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

        const created = await manifestCrudService.insert(relationName, relationData, { actorUsername: req.auth.username });
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
        const { visibilityAuth, viewingCharacterIds, viewingCharacterHops } = await resolveVisibilityContext(req);
        let access = isEntityVisibleToUser(record, req.params.entityRoute, visibilityAuth, viewingCharacterIds) ? 'full' : 'hidden';

        // For players (or DM previewing as a character), compute the full transitive visibility
        // graph (not just direct relations) once, so it can be reused both for the main entity
        // check and for filtering relations below.
        let visibleEntityHops;
        if (visibilityAuth && visibilityAuth.role === 'player' && viewingCharacterIds.length > 0) {
            visibleEntityHops = await getVisibleEntityIdsForUser(
                manifestCrudService,
                viewingCharacterIds,
                viewingCharacterHops
            );
            if (access === 'hidden') {
                access = resolveEntityAccess(record, req.params.entityRoute, visibilityAuth, viewingCharacterIds, visibleEntityHops, viewingCharacterHops);
            }
        }

        if (access === 'hidden') {
            return res.status(404).json({ error: 'Record not found' });
        }

        // A locked entity's own facts, exposition, and relations stay hidden entirely.
        if (access === 'locked') {
            return res.json({ entity: buildLockedEntityStub(record, req.params.entityRoute), related: {} });
        }

        const pendingProposal = await getPendingProposalForTarget(entityName, buildEntityTargetKey(idField, idValue));

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
                visibilityAuth,
                viewingCharacterIds,
                visibleEntityHops,
                viewingCharacterHops,
                relation.relatedRoute
            );
        }

        const response = {
            entity: { ...record, pendingProposal: await toProposalView(pendingProposal) },
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
        const { visibilityAuth, viewingCharacterIds, viewingCharacterHops } = await resolveVisibilityContext(req);
        let sourceVisible = isEntityVisibleToUser(sourceRecord, req.params.entityRoute, visibilityAuth, viewingCharacterIds);

        let visibleEntityIds;
        if (visibilityAuth && visibilityAuth.role === 'player' && viewingCharacterIds.length > 0) {
            visibleEntityIds = await getVisibleEntityIdsForUser(
                manifestCrudService,
                viewingCharacterIds,
                viewingCharacterHops
            );
            if (!sourceVisible) {
                sourceVisible = visibleEntityIds.has(sourceId);
            }
        }

        if (!sourceVisible) {
            return res.status(404).json({ error: 'Record not found' });
        }

        const records = await loadAssociatedRecords(
            relationName,
            relationDef,
            sourceId,
            anchorMemberIndex,
            visibilityAuth,
            viewingCharacterIds,
            visibleEntityIds,
            viewingCharacterHops,
            req.params.relatedRoute
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

        // Resolve viewing character for visibility checking
        const { visibilityAuth, viewingCharacterIds } = await resolveVisibilityContext(req);

        let sourceEntity = null;
        let relatedEntity = null;
        const shouldCheckRelationVisibility = !!visibilityAuth && visibilityAuth.role !== 'dm';

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
                    if (!isRelationVisibleToUser(relationName, memberEntities, visibilityAuth, viewingCharacterIds)) {
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
                if (!isRelationVisibleToUser(relationName, memberEntities, visibilityAuth, viewingCharacterIds)) {
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
            if (!isRelationVisibleToUser(relationName, memberEntities, visibilityAuth, viewingCharacterIds)) {
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

        const whereCandidates = buildRelationWhereCandidates({
            members,
            anchorMemberIndex,
            sourceId,
            relatedId,
            relationDef,
            historyValue,
        });

        await assertNoPendingProposal(
            relationName,
            buildRelationWhere({ members, anchorMemberIndex, sourceId, relatedId, relationDef, historyValue })
        );

        const result = await updateFirstRelationRecordByWhereCandidates(
            relationName,
            whereCandidates,
            updates,
            { actorUsername: req.auth.username }
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

        await assertNoPendingProposal(
            relationName,
            buildRelationWhere({ members, anchorMemberIndex, sourceId, relatedId, relationDef, historyValue })
        );

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

// propose a change to this relation (player-only; locks the record until a DM accepts/rejects)
router.post('/:entityRoute/:id/:relatedRoute/:relatedId/propose', async (req, res) => {
    try {
        const authErr = ensurePlayerForProposal(req);
        if (authErr) {
            return res.status(authErr.status).json({ error: authErr.error });
        }

        const { entityName, entityDef } = getEntityByRoute(req.params.entityRoute);
        const { relationName, relationDef, anchorMemberIndex } = getRelationByRoutes(
            req.params.entityRoute,
            req.params.relatedRoute
        );

        if (relationDef.kind === 'simple') {
            return res.status(400).json({ error: 'This relation type has no editable fields' });
        }

        const members = getRelationMembers(relationDef);
        const { relatedMember, relatedEntityDef } = getRelatedMemberInfo(relationDef, anchorMemberIndex);

        const sourceIdField = entityDef.idField;
        const sourceId = coerceValueByType(entityDef.fields[sourceIdField].type, req.params.id);
        const relatedIdField = relatedEntityDef.idField;
        const relatedId = coerceValueByType(relatedEntityDef.fields[relatedIdField].type, req.params.relatedId);

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

        const row = await getFirstRelationRecordByWhereCandidates(relationName, whereCandidates);
        if (!row) {
            return res.status(404).json({ error: 'Record not found' });
        }

        const { visibilityAuth, viewingCharacterIds, viewingCharacterHops } = await resolveVisibilityContext(req);
        const sourceEntity = await manifestCrudService.getOne(entityName, { [sourceIdField]: sourceId });
        const relatedEntity = await manifestCrudService.getOne(relatedMember.entity, { [relatedIdField]: relatedId });
        const memberEntities = anchorMemberIndex === 0 ? [sourceEntity, relatedEntity] : [relatedEntity, sourceEntity];

        if (!sourceEntity || !relatedEntity || !isRelationVisibleToUser(relationName, memberEntities, visibilityAuth, viewingCharacterIds)) {
            return res.status(404).json({ error: 'Record not found' });
        }

        if (
            isForeignPlayerCharacter(entityName, sourceEntity, viewingCharacterIds) ||
            isForeignPlayerCharacter(relatedMember.entity, relatedEntity, viewingCharacterIds)
        ) {
            return res.status(403).json({ error: "Cannot propose edits to another player's character" });
        }

        if (visibilityAuth && visibilityAuth.role === 'player' && viewingCharacterIds.length > 0) {
            const visibleEntityHops = await getVisibleEntityIdsForUser(
                manifestCrudService,
                viewingCharacterIds,
                viewingCharacterHops
            );
            const sourceLocked = isTargetEntityLocked(sourceEntity, req.params.entityRoute, visibilityAuth, viewingCharacterIds, visibleEntityHops, viewingCharacterHops);
            const relatedLocked = isTargetEntityLocked(relatedEntity, req.params.relatedRoute, visibilityAuth, viewingCharacterIds, visibleEntityHops, viewingCharacterHops);
            if (sourceLocked || relatedLocked) {
                return res.status(403).json({ error: 'Cannot propose edits to a locked record' });
            }
        }

        const targetKey = buildRelationWhere({ members, anchorMemberIndex, sourceId, relatedId, relationDef, historyValue });
        await assertNoPendingProposal(relationName, targetKey);

        const changes = filterProposableChanges(req.body, relationDef.payload);
        const diff = diffAgainstCurrent(changes, row);
        if (Object.keys(diff).length === 0) {
            return res.status(400).json({ error: 'No proposed changes differ from the current record' });
        }

        const proposal = await createProposal({
            targetKind: 'relation',
            resourceName: relationName,
            targetKey,
            baseSnapshot: row,
            proposedChanges: diff,
            proposedBy: req.auth.userId,
            proposedAt: new Date().toISOString(),
        });

        return res.status(201).json(await toProposalView(proposal));
    } catch (err) {
        if (err && err.message === 'Record not found') {
            return res.status(404).json({ error: 'Record not found' });
        }

        const httpErr = toHttpError(err);
        return res.status(httpErr.status).json({ error: httpErr.message });
    }
});

module.exports = router;