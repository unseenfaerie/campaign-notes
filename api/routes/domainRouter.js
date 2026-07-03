const express = require('express');
const { domainManifest } = require('../../common/domainManifest');
const { manifestCrudService } = require('../genericCrudService');

const router = express.Router();

function coerceValueByType(type, value) {
    if (value === undefined || value === null) return value;

    if (type === 'number') {
        const n = Number(value);
        if (Number.isNaN(n)) {
            throw new Error(`Invalid number value: ${value}`);
        }
        return n;
    }

    if (type === 'boolean') {
        if (value === true || value === false) return value;
        if (typeof value === 'string') {
            const normalized = value.trim().toLowerCase();
            if (normalized === 'true') return true;
            if (normalized === 'false') return false;
        }
        throw new Error(`Invalid boolean value: ${value}`);
    }

    if (type === 'string') {
        return String(value);
    }

    return value;
}

function getEntityByRoute(entityRoute, manifest = domainManifest) {
    for (const [entityName, entityDef] of Object.entries(manifest.entities)) {
        if (entityDef.route === entityRoute) {
            return { entityName, entityDef };
        }
    }

    throw new Error(`Unknown entity route: ${entityRoute}`);
}

function getRelationMembers(relationDef) {
    if (Array.isArray(relationDef.members) && relationDef.members.length === 2) {
        return relationDef.members;
    }

    if (relationDef.source && relationDef.target && relationDef.sourceKey && relationDef.targetKey) {
        return [
            { entity: relationDef.source, key: relationDef.sourceKey, route: relationDef.routeFromSource },
            { entity: relationDef.target, key: relationDef.targetKey, route: relationDef.routeFromTarget },
        ];
    }

    throw new Error('Relation must define exactly two members');
}

function getRelationByRoutes(entityRoute, relatedRoute, manifest = domainManifest) {
    const { entityName } = getEntityByRoute(entityRoute, manifest);

    for (const [relationName, relationDef] of Object.entries(manifest.relations)) {
        const members = getRelationMembers(relationDef);

        for (let anchorMemberIndex = 0; anchorMemberIndex < members.length; anchorMemberIndex += 1) {
            const anchorMember = members[anchorMemberIndex];
            const relatedMember = members[anchorMemberIndex === 0 ? 1 : 0];
            const anchorEntityDef = manifest.entities[anchorMember.entity];
            if (!anchorEntityDef || anchorEntityDef.route !== entityRoute) {
                continue;
            }

            if (anchorMember.route === relatedRoute) {
                return {
                    relationName,
                    relationDef,
                    anchorMemberIndex,
                    relatedMemberIndex: anchorMemberIndex === 0 ? 1 : 0,
                };
            }
        }
    }

    throw new Error(`Unknown related route for ${entityRoute}: ${relatedRoute}`);
}

function conformObjectToEntity(obj, entityDef) {
    const normalized = {};

    for (const [field, rawValue] of Object.entries(obj || {})) {
        const fieldDef = entityDef.fields[field];
        if (!fieldDef) {
            throw new Error(`Unknown field for route ${entityDef.route}: ${field}`);
        }

        normalized[field] = coerceValueByType(fieldDef.type, rawValue);
    }

    return normalized;
}

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

    if (/Invalid number value|Invalid boolean value|Unknown field for route/i.test(message)) {
        return { status: 400, message };
    }

    return { status: 500, message };
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
        const { entityName, entityDef } = getEntityByRoute(req.params.entityRoute);
        const idField = entityDef.idField;
        const idMeta = entityDef.fields[idField];
        const idValue = coerceValueByType(idMeta.type, req.params.id);

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

module.exports = router;