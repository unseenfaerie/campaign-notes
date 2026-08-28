const { domainManifest } = require('../../common/domainManifest');

function toSqlType(type) {
    if (type === 'number') return 'INTEGER';
    if (type === 'boolean') return 'INTEGER';
    return 'TEXT';
}

function makeEntityTableSql(def) {
    const cols = [];
    const primary = [];

    for (const [field, meta] of Object.entries(def.fields || {})) {
        if (meta.autoIncrement && meta.primary) {
            cols.push(field + ' INTEGER PRIMARY KEY AUTOINCREMENT');
            continue;
        }

        let col = field + ' ' + toSqlType(meta.type);
        if (meta.required) col += ' NOT NULL';
        cols.push(col);

        if (meta.primary) primary.push(field);
    }

    if (primary.length === 1 && !cols.some((c) => c.includes('PRIMARY KEY'))) {
        const pk = primary[0];
        cols.splice(cols.findIndex((c) => c.startsWith(pk + ' ')), 1, cols.find((c) => c.startsWith(pk + ' ')) + ' PRIMARY KEY');
    }

    if (primary.length > 1) cols.push('PRIMARY KEY (' + primary.join(', ') + ')');

    for (const c of def.constraints || []) {
        if (c.type === 'unique') cols.push('UNIQUE(' + c.fields.join(', ') + ')');
    }

    return 'CREATE TABLE IF NOT EXISTS ' + def.table + ' (\n  ' + cols.join(',\n  ') + '\n)';
}

function makeRelationTableSql(relName, rel, manifest) {
    const cols = [];
    const fks = [];

    const members = rel.members || [];
    if (members.length !== 2) {
        throw new Error(`Relation ${relName} must define exactly two members`);
    }

    for (const member of members) {
        if (!manifest.entities[member.entity]) {
            throw new Error(`Unknown relation entity for ${relName}: ${member.entity}`);
        }

        cols.push(member.key + ' TEXT NOT NULL');
    }

    for (const [field, meta] of Object.entries(rel.payload || {})) {
        if (members.some((member) => member.key === field)) continue;
        let col = field + ' ' + toSqlType(meta.type);
        if (meta.required) col += ' NOT NULL';
        cols.push(col);
    }

    cols.push('PRIMARY KEY (' + rel.keys.join(', ') + ')');

    return 'CREATE TABLE IF NOT EXISTS ' + rel.table + ' (\n  ' + cols.concat(fks).join(',\n  ') + '\n)';
}

function buildAllCreateTableSql(manifest = domainManifest) {
    const statements = [];

    for (const [name, def] of Object.entries(manifest.entities)) {
        statements.push(makeEntityTableSql(def));

        for (const [field, meta] of Object.entries(def.fields || {})) {
            if (meta.ref) {
                statements.push(`CREATE INDEX IF NOT EXISTS idx_${def.table}_${field} ON ${def.table}(${field})`);
            }
        }
    }

    for (const [name, rel] of Object.entries(manifest.relations)) {
        statements.push(makeRelationTableSql(name, rel, manifest));
    }

    return statements;
}

module.exports = { buildAllCreateTableSql };