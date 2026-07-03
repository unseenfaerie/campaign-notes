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
    const anchorMember = members[anchorMemberIndex];
    const relatedMember = members[anchorMemberIndex === 0 ? 1 : 0];

    let relationRows;
    if (anchorMember.entity === relatedMember.entity) {
        const [forwardRows, reverseRows] = await Promise.all([
            manifestCrudService.getMany(relationName, {
                [anchorMember.key]: sourceId,
            }),
            manifestCrudService.getMany(relationName, {
                [relatedMember.key]: sourceId,
            }),
        ]);

        relationRows = dedupeRows([...forwardRows, ...reverseRows]);
    } else {
        relationRows = await manifestCrudService.getMany(relationName, {
            [anchorMember.key]: sourceId,
        });
    }

    if (relationRows.length === 0) {
        return [];
    }

    const targetEntityDef = domainManifest.entities[relatedMember.entity];
    const targetIdField = targetEntityDef.idField;

    const targetIds = [...new Set(
        relationRows
            .map((row) => getRelatedIdForRow(row, members, sourceId, anchorMemberIndex))
            .filter((targetId) => targetId !== null && targetId !== undefined)
    )];
    const targets = await Promise.all(
        targetIds.map((targetId) =>
            manifestCrudService.getOne(relatedMember.entity, {
                [targetIdField]: targetId,
            })
        )
    );

    const targetById = new Map(
        targets.filter(Boolean).map((target) => [target[targetIdField], target])
    );

    if (relationDef.kind === 'simple') {
        return targetIds.map((targetId) => targetById.get(targetId)).filter(Boolean);
    }

    if (relationDef.kind === 'relationship') {
        return relationRows
            .map((row) => {
                const targetId = getRelatedIdForRow(row, members, sourceId, anchorMemberIndex);
                const target = targetById.get(targetId);
                if (!target) return null;

                return {
                    ...target,
                    relationship: omitKeys(row, members.map((member) => member.key)),
                };
            })
            .filter(Boolean);
    }

    if (relationDef.kind === 'history') {
        return targetIds
            .map((targetId) => {
                const target = targetById.get(targetId);
                if (!target) return null;

                const history = relationRows
                    .filter((row) => getRelatedIdForRow(row, members, sourceId, anchorMemberIndex) === targetId)
                    .map((row) => omitKeys(row, members.map((member) => member.key)));

                return {
                    ...target,
                    history,
                };
            })
            .filter(Boolean);
    }

    return relationRows;
}

function toHttpError(err) {
    const message = err && err.message ? err.message : 'Unexpected error';

    if (/Unknown entity route|Unknown related route/i.test(message)) {
        return { status: 404, message };
    }

    if (
        /Invalid number value|Invalid boolean value|Unknown field for route|Primary key updates are not allowed|Data must be an object/i.test(
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

module.exports = router;