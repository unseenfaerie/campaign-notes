const { runStatement } = require('../utils/migrationService');

function getRows(database, sql) {
    return new Promise((resolve, reject) => {
        database.all(sql, (error, rows) => error ? reject(error) : resolve(rows));
    });
}

module.exports = {
    version: 8,
    description: 'Move place parents to containment relations',

    async up(database) {
        await runStatement(database, `CREATE TABLE IF NOT EXISTS place_containment (
            child_id TEXT NOT NULL,
            parent_id TEXT NOT NULL,
            visibility_direction TEXT NOT NULL DEFAULT 'both',
            last_edited_by TEXT,
            last_edited_at TEXT,
            PRIMARY KEY (child_id, parent_id)
        )`);
        await runStatement(database, 'CREATE UNIQUE INDEX IF NOT EXISTS idx_place_containment_child ON place_containment(child_id)');
        await runStatement(database, 'CREATE INDEX IF NOT EXISTS idx_place_containment_parent ON place_containment(parent_id)');
        await runStatement(database, `CREATE TRIGGER IF NOT EXISTS validate_place_containment
            BEFORE INSERT ON place_containment BEGIN
                SELECT RAISE(ABORT, 'Place does not exist')
                    WHERE NOT EXISTS (SELECT 1 FROM places WHERE id = NEW.child_id)
                       OR NOT EXISTS (SELECT 1 FROM places WHERE id = NEW.parent_id);
                SELECT RAISE(ABORT, 'Parent assignment would create a cycle')
                    WHERE NEW.child_id = NEW.parent_id OR EXISTS (
                        WITH RECURSIVE ancestors(id) AS (
                            SELECT NEW.parent_id
                            UNION
                            SELECT parent_id FROM place_containment JOIN ancestors ON child_id = ancestors.id
                        )
                        SELECT 1 FROM ancestors WHERE id = NEW.child_id
                    );
            END`);
        await runStatement(database, `CREATE TRIGGER IF NOT EXISTS delete_place_containment
            AFTER DELETE ON places BEGIN
                DELETE FROM place_containment WHERE child_id = OLD.id OR parent_id = OLD.id;
            END`);

        const columns = await getRows(database, 'PRAGMA table_info(places)');
        if (columns.some((column) => column.name === 'parent_id')) {
            const proposals = await getRows(database, `SELECT id, proposed_changes, base_snapshot FROM edit_proposals
                WHERE resource_name = 'Place' AND target_kind = 'entity' AND status = 'pending'`);
            if (proposals.some((proposal) => Object.hasOwn(JSON.parse(proposal.proposed_changes), 'parent_id'))) {
                throw new Error('Resolve pending Place parent proposals before migrating containment');
            }
            for (const proposal of proposals) {
                const snapshot = JSON.parse(proposal.base_snapshot);
                if (Object.hasOwn(snapshot, 'parent_id')) {
                    delete snapshot.parent_id;
                    await runStatement(database, 'UPDATE edit_proposals SET base_snapshot = ? WHERE id = ?',
                        [JSON.stringify(snapshot), proposal.id]);
                }
            }
            await runStatement(database, `INSERT INTO place_containment
                (child_id, parent_id, visibility_direction, last_edited_by, last_edited_at)
                SELECT id, parent_id, 'both', last_edited_by, last_edited_at FROM places
                WHERE parent_id IS NOT NULL AND parent_id <> ''`);
            await runStatement(database, 'DROP INDEX IF EXISTS idx_places_parent_id');
            await runStatement(database, 'ALTER TABLE places DROP COLUMN parent_id');
        }
    },
};
