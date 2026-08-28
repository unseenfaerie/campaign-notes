const { db } = require('./db');
const { domainManifest } = require('../../common/domainManifest');
const { getEnumValues } = require('../../common/enums');

function getRelationMembers(relationDef) {
  if (Array.isArray(relationDef.members) && relationDef.members.length === 2) {
    return relationDef.members;
  }

  if (relationDef.source && relationDef.target && relationDef.sourceKey && relationDef.targetKey) {
    return [
      { entity: relationDef.source, key: relationDef.sourceKey },
      { entity: relationDef.target, key: relationDef.targetKey },
    ];
  }

  throw new Error('Relation must define exactly two members');
}

function toResourceDefinition(resourceName, manifest = domainManifest) {
  const entityDef = manifest.entities[resourceName];
  if (entityDef) {
    const fields = Object.fromEntries(
      Object.entries(entityDef.fields).map(([fieldName, field]) => [
        fieldName,
        field.enum ? { ...field, enum: getEnumValues(field.enum) } : field,
      ])
    );
    const primaryKeys = Object.entries(fields)
      .filter(([, meta]) => meta.primary)
      .map(([field]) => field);

    return {
      kind: 'entity',
      name: resourceName,
      table: entityDef.table,
      fields,
      primaryKeys,
    };
  }

  const relationDef = manifest.relations[resourceName];
  if (relationDef) {
    const members = getRelationMembers(relationDef);
    const fields = {
      ...Object.fromEntries(
        members.map((member) => [member.key, { type: 'string', required: true, primary: true }])
      ),
      ...(relationDef.payload || {}),
    };

    for (const [fieldName, field] of Object.entries(fields)) {
      if (field.enum) fields[fieldName] = { ...field, enum: getEnumValues(field.enum) };
    }

    if (relationDef.historyKey && fields[relationDef.historyKey]) {
      fields[relationDef.historyKey] = {
        ...fields[relationDef.historyKey],
        primary: true,
      };
    }

    return {
      kind: 'relation',
      name: resourceName,
      table: relationDef.table,
      fields,
      members,
      primaryKeys:
        relationDef.keys || members.map((member) => member.key).concat(relationDef.historyKey ? [relationDef.historyKey] : []),
    };
  }

  throw new Error(`Unknown resource: ${resourceName}`);
}

function assertValidType(fieldName, value, type, enumValues) {
  if (value === null || value === undefined) return;

  if (type === 'string' && typeof value !== 'string') {
    throw new Error(`Invalid type for ${fieldName}: expected string`);
  }

  if (type === 'number' && (typeof value !== 'number' || Number.isNaN(value))) {
    throw new Error(`Invalid type for ${fieldName}: expected number`);
  }

  if (type === 'boolean' && typeof value !== 'boolean') {
    throw new Error(`Invalid type for ${fieldName}: expected boolean`);
  }

  if (enumValues && !enumValues.includes(value)) {
    throw new Error(`Invalid value for ${fieldName}: expected one of ${enumValues.join(', ')}`);
  }
}

function validateData(def, data, { partial = false } = {}) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Data must be an object');
  }

  const validated = {};

  for (const fieldName of Object.keys(data)) {
    if (!def.fields[fieldName]) {
      throw new Error(`Unknown field for ${def.name}: ${fieldName}`);
    }
  }

  for (const [fieldName, meta] of Object.entries(def.fields)) {
    const value = data[fieldName];
    const isMissing = value === undefined;

    if (!partial && meta.required && isMissing && !meta.autoIncrement) {
      throw new Error(`Missing required field: ${fieldName}`);
    }

    if (isMissing) continue;
    assertValidType(fieldName, value, meta.type, meta.enum);
    validated[fieldName] = value;
  }

  return validated;
}

function validateWhere(def, where, { allowEmpty = false } = {}) {
  if (!where || typeof where !== 'object' || Array.isArray(where)) {
    throw new Error('Where clause must be an object');
  }

  const keys = Object.keys(where);
  if (!allowEmpty && keys.length === 0) {
    throw new Error('Where clause cannot be empty');
  }

  for (const key of keys) {
    const meta = def.fields[key];
    if (!meta) throw new Error(`Unknown where field for ${def.name}: ${key}`);
    assertValidType(key, where[key], meta.type, meta.enum);
  }

  return where;
}

function buildWhereClause(def, where) {
  const fields = Object.keys(where);
  if (fields.length === 0) {
    return { clause: '', params: [] };
  }

  return {
    clause: `WHERE ${fields.map((field) => `${field} = ?`).join(' AND ')}`,
    params: fields.map((field) => toSqliteValue(def.fields[field].type, where[field])),
  };
}

// sqlite has no native boolean type, so booleans are stored as 0/1 integers here and nowhere else.
function toSqliteValue(type, value) {
  if (type === 'boolean' && typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  return value;
}

function fromSqliteRow(def, row) {
  if (!row) return row;

  const mapped = { ...row };
  for (const [fieldName, meta] of Object.entries(def.fields)) {
    if (meta.type === 'boolean' && mapped[fieldName] !== undefined && mapped[fieldName] !== null) {
      mapped[fieldName] = Boolean(mapped[fieldName]);
    }
  }

  return mapped;
}

function run(sql, params = [], sqliteDb = db) {
  return new Promise((resolve, reject) => {
    sqliteDb.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

function get(sql, params = [], sqliteDb = db) {
  return new Promise((resolve, reject) => {
    sqliteDb.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

function all(sql, params = [], sqliteDb = db) {
  return new Promise((resolve, reject) => {
    sqliteDb.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

function createManifestCrudService(manifest = domainManifest, sqliteDb = db) {
  sqliteDb.run('PRAGMA foreign_keys = ON');

  async function insert(resourceName, data) {
    const def = toResourceDefinition(resourceName, manifest);
    const validated = validateData(def, data, { partial: false });

    const fields = Object.keys(validated);
    if (fields.length === 0) {
      throw new Error('Cannot insert empty object');
    }

    const placeholders = fields.map(() => '?').join(', ');
    const sql = `INSERT INTO ${def.table} (${fields.join(', ')}) VALUES (${placeholders})`;
    await run(sql, fields.map((field) => toSqliteValue(def.fields[field].type, validated[field])), sqliteDb);

    const where = {};
    for (const key of def.primaryKeys) {
      if (validated[key] !== undefined) {
        where[key] = validated[key];
      }
    }

    if (Object.keys(where).length === def.primaryKeys.length) {
      return getOne(resourceName, where);
    }

    return { ...validated };
  }

  async function getMany(resourceName, where = {}) {
    const def = toResourceDefinition(resourceName, manifest);
    validateWhere(def, where, { allowEmpty: true });

    const { clause, params } = buildWhereClause(def, where);
    const sql = `SELECT * FROM ${def.table} ${clause}`;
    const rows = await all(sql, params, sqliteDb);
    return rows.map((row) => fromSqliteRow(def, row));
  }

  async function getOne(resourceName, where) {
    const def = toResourceDefinition(resourceName, manifest);
    validateWhere(def, where);

    const { clause, params } = buildWhereClause(def, where);
    const sql = `SELECT * FROM ${def.table} ${clause} LIMIT 1`;
    const row = await get(sql, params, sqliteDb);
    return fromSqliteRow(def, row);
  }

  async function update(resourceName, where, updates) {
    const def = toResourceDefinition(resourceName, manifest);
    validateWhere(def, where);
    const validatedUpdates = validateData(def, updates, { partial: true });

    for (const key of def.primaryKeys) {
      if (Object.prototype.hasOwnProperty.call(validatedUpdates, key)) {
        throw new Error(`Primary key updates are not allowed: ${key}`);
      }
    }

    const fields = Object.keys(validatedUpdates);
    if (fields.length === 0) {
      return { updated: 0, record: await getOne(resourceName, where) };
    }

    const setClause = fields.map((field) => `${field} = ?`).join(', ');
    const whereFields = Object.keys(where);
    const whereClause = whereFields.map((field) => `${field} = ?`).join(' AND ');

    const sql = `UPDATE ${def.table} SET ${setClause} WHERE ${whereClause}`;
    const params = [
      ...fields.map((field) => toSqliteValue(def.fields[field].type, validatedUpdates[field])),
      ...whereFields.map((field) => toSqliteValue(def.fields[field].type, where[field])),
    ];

    const result = await run(sql, params, sqliteDb);
    return {
      updated: result.changes,
      record: await getOne(resourceName, where),
    };
  }

  async function remove(resourceName, where) {
    const def = toResourceDefinition(resourceName, manifest);
    validateWhere(def, where);

    const whereFields = Object.keys(where);
    const whereClause = whereFields.map((field) => `${field} = ?`).join(' AND ');
    const sql = `DELETE FROM ${def.table} WHERE ${whereClause}`;

    const result = await run(
      sql,
      whereFields.map((field) => toSqliteValue(def.fields[field].type, where[field])),
      sqliteDb
    );

    return { deleted: result.changes };
  }

  function getResourceInfo(resourceName) {
    return toResourceDefinition(resourceName, manifest);
  }

  function listResources() {
    return {
      entities: Object.keys(manifest.entities),
      relations: Object.keys(manifest.relations),
    };
  }

  return {
    insert,
    getMany,
    getOne,
    update,
    remove,
    getResourceInfo,
    listResources,
  };
}

const manifestCrudService = createManifestCrudService();

module.exports = {
  createManifestCrudService,
  manifestCrudService,
};