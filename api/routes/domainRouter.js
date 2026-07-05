const express = require('express');
const { domainManifest } = require('../../common/domainManifest');
const { manifestCrudService } = require('../data/genericCrudService');
const {
    coerceValueByType,
    getEntityByRoute,
    getRelationMembers,
    getRelationByRoutes,
    conformObjectToEntity,
} = require('../utils/manifestHelpers');
const {
    getRelatedMemberInfo,
    normalizeRelationPayload,
    normalizeRelationUpdatePayload,
    getValidatedHistorySelector,
    buildRelationInsertData,
    buildRelationWhere,
} = require('../utils/relationWriteHelpers');

const router = express.Router();

function omitKeys(record, keys) {
    const normalized = { ...record };
    for (const key of keys) {
        delete normalized[key];
    }
    return normalized;
}

function dedupeRows(rows) {
    const seen = new Set();
    const deduped = [];

    for (const row of rows) {
        const key = JSON.stringify(row);
        if (seen.has(key)) continue;
        seen.add(key);
        deduped.push(row);
    }

    return deduped;
}

function getRelatedIdForRow(row, members, sourceId, anchorMemberIndex) {
    const anchorMember = members[anchorMemberIndex];
    const relatedMember = members[anchorMemberIndex === 0 ? 1 : 0];

    if (anchorMember.entity === relatedMember.entity) {
        const anchorMatches = row[anchorMember.key] === sourceId;
        const relatedMatches = row[relatedMember.key] === sourceId;

        if (anchorMatches && relatedMatches) {
            return sourceId;
        }

        if (anchorMatches) {
            return row[relatedMember.key];
        }

        if (relatedMatches) {
            return row[anchorMember.key];
        }

        return null;
    }

    return row[relatedMember.key];
}

async function loadAssociatedRecords(relationName, relationDef, sourceId, anchorMemberIndex) {
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

    if (relationDef.kind === 'simple') {
        return buildSimpleResults(targetIds, targetById);
    }

    if (relationDef.kind === 'relationship') {
        return buildRelationshipResults(relationRows, targetById, members, memberKeys, sourceId, anchorMemberIndex);
    }

    if (relationDef.kind === 'history') {
        return buildHistoryResults(targetIds, relationRows, targetById, members, memberKeys, sourceId, anchorMemberIndex);
    }

    return relationRows;
}

function getRelationContext(members, anchorMemberIndex) {
    return {
        anchorMember: members[anchorMemberIndex],
        relatedMember: members[anchorMemberIndex === 0 ? 1 : 0],
    };
}

async function loadRelationRows(relationName, relationContext, sourceId) {
    const { anchorMember, relatedMember } = relationContext;

    if (anchorMember.entity !== relatedMember.entity) {
        return manifestCrudService.getMany(relationName, {
            [anchorMember.key]: sourceId,
        });
    }

    const [forwardRows, reverseRows] = await Promise.all([
        manifestCrudService.getMany(relationName, {
            [anchorMember.key]: sourceId,
        }),
        manifestCrudService.getMany(relationName, {
            [relatedMember.key]: sourceId,
        }),
    ]);

    return dedupeRows([...forwardRows, ...reverseRows]);
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
        /Invalid number value|Invalid boolean value|Unknown field for route|Unknown field for relation|Unknown query field for relation|Missing required query field|Cannot update primary key field|Primary key updates are not allowed|Data must be an object/i.test(
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

/* BASIC ENTITY ROUTES */
// create entity
router.post('/:entityRoute', async (req, res) => {
    try {
        const { entityName, entityDef } = getEntityByRoute(req.params.entityRoute);
        const validated = conformObjectToEntity(req.body, entityDef)
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

        return res.json(records);
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

        const records = await loadAssociatedRecords(relationName, relationDef, sourceId, anchorMemberIndex);
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

        const where = {
            [sourceIdField]: sourceId,
            [relatedIdField]: relatedId
        };

        if (relationDef.kind === 'history' && relationDef.historyKey) {
            const historyValue = getValidatedHistorySelector(req.query, relationDef, { required: false });
            if (historyValue !== undefined) {
                where[relationDef.historyKey] = historyValue;

                const record = await manifestCrudService.getOne(relationName, where);
                if (!record) {
                    return res.status(404).json({ error: 'Record not found' });
                }

                return res.json(record);
            }

            const records = await manifestCrudService.getMany(relationName, where);
            if (records.length === 0) {
                return res.status(404).json({ error: 'Record not found' });
            }

            return res.json(records);
        }

        const record = await manifestCrudService.getOne(relationName, where);
        if (!record) {
            return res.status(404).json({ error: 'Record not found' });
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
        const where = buildRelationWhere({
            members,
            anchorMemberIndex,
            sourceId,
            relatedId,
            relationDef,
            historyValue,
        });

        const result = await manifestCrudService.update(relationName, where, updates);

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

        const where = buildRelationWhere({
            members,
            anchorMemberIndex,
            sourceId,
            relatedId,
            relationDef,
            historyValue,
        });

        const result = await manifestCrudService.remove(relationName, where);

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