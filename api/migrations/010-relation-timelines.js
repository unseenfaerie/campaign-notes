const { randomUUID } = require('crypto');
const { domainManifest } = require('../../common/domainManifest');
const { validateTimeline } = require('../../common/relationTimeline');
const { buildAllCreateTableSql } = require('../data/schemaBuilder');
const { runStatement } = require('../utils/migrationService');

const legacyRelations = {
    CharacterDeity: { start: 'adopted_date', end: 'dissolution_date', startLabel: 'Adopted', endLabel: 'Dissolved' },
    CharacterItem: { start: 'acquired_date', end: 'relinquished_date', startLabel: 'Acquired', endLabel: 'Relinquished' },
    CharacterOrganization: { start: 'joined_date', end: 'left_date', startLabel: 'Joined', endLabel: 'Left' },
    CharacterPlace: { start: 'arrived_date', end: 'left_date', startLabel: 'Arrived', endLabel: 'Left' },
    CharacterRelationship: { start: 'established_date', end: 'dissolution_date', startLabel: 'Established', endLabel: 'Dissolved' },
};

function all(database, sql, params = []) {
    return new Promise((resolve, reject) => {
        database.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows));
    });
}

function convertLegacyRows(name, rows) {
    const definition = domainManifest.relations[name];
    const legacy = legacyRelations[name];
    const keys = definition.members.map(member => member.key);
    const groups = new Map();
    for (const row of rows) {
        const key = JSON.stringify(keys.map(field => row[field]));
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(row);
    }

    return [...groups.values()].map(group => {
        group.sort((a, b) => String(a[legacy.start]).localeCompare(String(b[legacy.start])));
        const directions = new Set(group.map(row => row.visibility_direction));
        if (directions.size !== 1 || !['first_to_second', 'second_to_first', 'both'].includes(group[0].visibility_direction)) {
            throw new Error(`Conflicting visibility directions in ${definition.table} for ${keys.map(key => group[0][key]).join(', ')}; review the rows before migrating`);
        }
        const latest = group[group.length - 1];
        const timeline = [];
        for (const row of group) {
            const details = [row.short_description, row.long_explanation].filter(Boolean).join('\n\n');
            timeline.push({
                id: randomUUID(),
                description: details ? `${legacy.startLabel}: ${details}` : legacy.startLabel,
                date: row[legacy.start] || null,
            });
            if (row[legacy.end]) {
                timeline.push({ id: randomUUID(), description: legacy.endLabel, date: row[legacy.end] });
            }
        }
        timeline.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
        try {
            validateTimeline(timeline);
        } catch (error) {
            throw new Error(`Invalid legacy timeline in ${definition.table}: ${error.message}`);
        }
        const record = {};
        for (const field of [...keys, ...Object.keys(definition.payload), 'last_edited_by', 'last_edited_at']) {
            record[field] = field === 'timeline' ? JSON.stringify(timeline) : (latest[field] ?? null);
        }
        return record;
    });
}

async function insertConvertedRows(database, name, rows, { ignore = false } = {}) {
    const definition = domainManifest.relations[name];
    for (const record of convertLegacyRows(name, rows)) {
        const fields = Object.keys(record);
        await runStatement(database,
            `INSERT ${ignore ? 'OR IGNORE ' : ''}INTO ${definition.table} (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`,
            fields.map(field => record[field]));
    }
}

module.exports = {
    version: 10,
    description: 'Replace dated relationship records with ordered timelines',
    legacyRelations,
    insertConvertedRows,
    async up(database) {
        const names = Object.keys(legacyRelations);
        const pending = await all(database,
            `SELECT id, resource_name FROM edit_proposals WHERE status = 'pending' AND target_kind = 'relation'
                AND resource_name IN (${names.map(() => '?').join(', ')})`, names);
        if (pending.length) throw new Error('Resolve pending historical relation proposals before migrating timelines');

        const createStatements = buildAllCreateTableSql();
        for (const name of names) {
            const definition = domainManifest.relations[name];
            const columns = await all(database, `PRAGMA table_info(${definition.table})`);
            if (!columns.some(column => column.name === legacyRelations[name].start)) continue;
            const rows = await all(database, `SELECT * FROM ${definition.table}`);
            // Validate before replacing the old table.
            convertLegacyRows(name, rows);
            await runStatement(database, `ALTER TABLE ${definition.table} RENAME TO ${definition.table}_legacy_v10`);
            const createSql = createStatements.find(sql => sql.startsWith(`CREATE TABLE IF NOT EXISTS ${definition.table} (`));
            await runStatement(database, createSql);
            await insertConvertedRows(database, name, rows);
            await runStatement(database, `DROP TABLE ${definition.table}_legacy_v10`);
        }
    },
};
