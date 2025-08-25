// services/aliases.js
const dbUtils = require('../../utils/dbUtils');
const TABLE = 'aliases';

function addAlias(entity_type, entity_id, alias) { return dbUtils.insert(TABLE, { entity_type, entity_id, alias }); }
function getAliasesForEntity(entity_type, entity_id) { return dbUtils.select(TABLE, { entity_type, entity_id }); }
function getEntitiesByAlias(alias) { return dbUtils.select(TABLE, { alias }); }
function removeAlias(entity_type, entity_id, alias) { return dbUtils.remove(TABLE, { entity_type, entity_id, alias }); }

module.exports = { addAlias, getAliasesForEntity, getEntitiesByAlias, removeAlias };
