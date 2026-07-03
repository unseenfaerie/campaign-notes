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

function getRelationByRoutes(entityRoute, relatedRoute, manifest = domainManifest) {
    const { entityName } = getEntityByRoute(entityRoute, manifest);

    for (const [relationName, relationDef] of Object.entries(manifest.relations)) {
        if (relationDef.source === entityName && relationDef.routeFromSource === relatedRoute) {
            return { relationName, relationDef };
        }
    }

    throw new Error(`Unknown related route for ${entityRoute}: ${relatedRoute}`);
}

function coerceEntityWhere(entityDef, where) {
    const normalized = {};

    for (const [field, rawValue] of Object.entries(where || {})) {
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

async function loadAssociatedRecords(relationName, relationDef, sourceId) {
    const relationRows = await manifestCrudService.getMany(relationName, {
        [relationDef.sourceKey]: sourceId,
    });

    if (relationRows.length === 0) {
        return [];
    }

    const targetEntityDef = domainManifest.entities[relationDef.target];
    const targetIdField = targetEntityDef.idField;

    const targetIds = [...new Set(relationRows.map((row) => row[relationDef.targetKey]))];
    const targets = await Promise.all(
        targetIds.map((targetId) =>
            manifestCrudService.getOne(relationDef.target, {
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
                const target = targetById.get(row[relationDef.targetKey]);
                if (!target) return null;

                return {
                    ...target,
                    relationship: omitKeys(row, [relationDef.sourceKey, relationDef.targetKey]),
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
                    .filter((row) => row[relationDef.targetKey] === targetId)
                    .map((row) => omitKeys(row, [relationDef.sourceKey, relationDef.targetKey]));

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

router.get('/:entityRoute', async (req, res) => {
    try {
        const { entityName, entityDef } = getEntityByRoute(req.params.entityRoute);
        const where = coerceEntityWhere(entityDef, req.query);
        const records = await manifestCrudService.getMany(entityName, where);

        return res.json(records);
    } catch (err) {
        const httpErr = toHttpError(err);
        return res.status(httpErr.status).json({ error: httpErr.message });
    }
});

router.get('/:entityRoute/:id/:relatedRoute', async (req, res) => {
    try {
        const { entityName, entityDef } = getEntityByRoute(req.params.entityRoute);
        const { relationName, relationDef } = getRelationByRoutes(
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

        const records = await loadAssociatedRecords(relationName, relationDef, sourceId);
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