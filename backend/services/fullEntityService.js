// backend/services/fullEntityService.js
// Generic service for assembling a "full" entity response using the entity registry

const { entityRegistry, entityTableMap } = require('../../common/entityRegistry');
const dbUtils = require('../utils/dbUtils');

/**
 * Get a full entity with all relationships/history, based on the registry
 * @param {string} entityType - e.g. "Character"
 * @param {string} id - entity id
 * @returns {Promise<object|null>} - full entity object or null if not found
 */
async function getFullEntityById(entityType, id) {
  try {
    // 1. Get main entity row
    const mainTable = entityTableMap[entityType];
    if (!mainTable) throw new Error(`No table mapping for entity type: ${entityType}`);
    const mainEntity = await dbUtils.select(mainTable, { id }, true);
    if (!mainEntity) return null;

    // 2. Prepare to iterate over registry for this entity type
    const associations = entityRegistry[entityType] || [];
    const result = { ...mainEntity };

    // 3. For each association, query join table and fetch related entities
    for (const assoc of associations) {
      try {
        const relatedTable = entityTableMap[assoc.relatedEntity];
        if (!relatedTable) {
          console.error(`[FullEntityService] No table mapping for related entity: ${assoc.relatedEntity}`);
          continue;
        }

        const joinTable = assoc.joinTable;
        const mainIdField = assoc.mainIdField;
        const relatedIdField = assoc.relatedIdField;
        if (!mainIdField || !relatedIdField) {
          console.error(`[FullEntityService] mainIdField or relatedIdField not defined for join table: ${joinTable}`);
          continue;
        }

        const joinRows = await dbUtils.select(joinTable, { [mainIdField]: id });
        if (!joinRows || joinRows.length === 0) {
          result[relatedTable] = [];
          continue;
        }

        if (assoc.type === 'simple') {
          // Just return related entity main table info (no join metadata)
          const relatedEntities = await Promise.all(
            joinRows.map(async jr => {
              try {
                return await dbUtils.select(
                  relatedTable,
                  { id: jr[relatedIdField] },
                  true
                );
              } catch (err) {
                console.error(`[FullEntityService] Error fetching related entity (${relatedTable}):`, err);
                return null;
              }
            })
          );
          result[relatedTable] = relatedEntities.filter(Boolean);
        } else if (assoc.type === 'relationship') {
          // One join row per related entity, attach join metadata as 'relationship'
          const relatedEntities = await Promise.all(
            joinRows.map(async jr => {
              try {
                const related = await dbUtils.select(
                  relatedTable,
                  { id: jr[relatedIdField] },
                  true
                );
                if (!related) return null;
                const relationship = {};
                for (const field of assoc.joinFields) {
                  relationship[field] = jr[field];
                }
                return { ...related, relationship };
              } catch (err) {
                console.error(`[FullEntityService] Error fetching related entity (${relatedTable}):`, err);
                return null;
              }
            })
          );
          result[relatedTable] = relatedEntities.filter(Boolean);
        } else if (assoc.type === 'history') {
          // Group join rows by related entity, attach join metadata as 'history' array
          const grouped = {};
          for (const jr of joinRows) {
            const relId = jr[relatedIdField];
            if (!grouped[relId]) grouped[relId] = [];
            const historyEntry = {};
            for (const field of assoc.joinFields) {
              historyEntry[field] = jr[field];
            }
            grouped[relId].push(historyEntry);
          }
          const relatedEntities = await Promise.all(
            Object.entries(grouped).map(async ([relId, history]) => {
              try {
                const related = await dbUtils.select(
                  relatedTable,
                  { id: relId },
                  true
                );
                if (!related) return null;
                return { ...related, history };
              } catch (err) {
                console.error(`[FullEntityService] Error fetching related entity (${relatedTable}):`, err);
                return null;
              }
            })
          );
          result[relatedTable] = relatedEntities.filter(Boolean);
        }
      } catch (assocErr) {
        console.error(`[FullEntityService] Error processing association for ${assoc.relatedEntity}:`, assocErr);
        result[entityTableMap[assoc.relatedEntity]] = { error: assocErr.message };
      }
    }

    return result;
  } catch (err) {
    console.error(`[FullEntityService] Error in getFullEntityById for ${entityType} (${id}):`, err);
    return null;
  }
}

module.exports = {
  getFullEntityById
};
