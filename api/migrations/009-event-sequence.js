const { runStatement } = require('../utils/migrationService');

function getRows(database, sql) {
    return new Promise((resolve, reject) => {
        database.all(sql, (error, rows) => error ? reject(error) : resolve(rows));
    });
}

module.exports = {
    version: 9,
    description: 'Move event order to sequence relations',

    async up(database) {
        await runStatement(database, `CREATE TABLE IF NOT EXISTS event_sequence (
            earlier_id TEXT NOT NULL,
            later_id TEXT NOT NULL,
            visibility_direction TEXT NOT NULL DEFAULT 'both',
            last_edited_by TEXT,
            last_edited_at TEXT,
            PRIMARY KEY (earlier_id, later_id)
        )`);
        await runStatement(database, 'CREATE INDEX IF NOT EXISTS idx_event_sequence_later ON event_sequence(later_id)');
        await runStatement(database, `CREATE TRIGGER IF NOT EXISTS validate_event_sequence
            BEFORE INSERT ON event_sequence BEGIN
                SELECT RAISE(ABORT, 'Event does not exist')
                    WHERE NOT EXISTS (SELECT 1 FROM events WHERE id = NEW.earlier_id)
                       OR NOT EXISTS (SELECT 1 FROM events WHERE id = NEW.later_id);
                SELECT RAISE(ABORT, 'Event ordering would create a cycle')
                    WHERE NEW.earlier_id = NEW.later_id OR EXISTS (
                        WITH RECURSIVE successors(id) AS (
                            SELECT NEW.later_id
                            UNION
                            SELECT later_id FROM event_sequence JOIN successors ON earlier_id = successors.id
                        )
                        SELECT 1 FROM successors WHERE id = NEW.earlier_id
                    );
            END`);
        await runStatement(database, `CREATE TRIGGER IF NOT EXISTS delete_event_sequence
            AFTER DELETE ON events BEGIN
                DELETE FROM event_sequence WHERE earlier_id = OLD.id OR later_id = OLD.id;
            END`);

        const columns = await getRows(database, 'PRAGMA table_info(events)');
        const hasPrevious = columns.some((column) => column.name === 'previous_event_id');
        const hasNext = columns.some((column) => column.name === 'next_event_id');
        if (hasPrevious !== hasNext) {
            throw new Error('Expected both legacy event order fields');
        }
        if (hasPrevious) {
            const proposals = await getRows(database, `SELECT id, proposed_changes, base_snapshot FROM edit_proposals
                WHERE resource_name = 'Event' AND target_kind = 'entity' AND status = 'pending'`);
            const legacyFields = ['previous_event_id', 'next_event_id'];
            if (proposals.some((proposal) => {
                const changes = JSON.parse(proposal.proposed_changes);
                return legacyFields.some((field) => Object.hasOwn(changes, field));
            })) {
                throw new Error('Resolve pending Event order proposals before migrating event sequence');
            }
            for (const proposal of proposals) {
                const snapshot = JSON.parse(proposal.base_snapshot);
                if (legacyFields.some((field) => Object.hasOwn(snapshot, field))) {
                    for (const field of legacyFields) delete snapshot[field];
                    await runStatement(database, 'UPDATE edit_proposals SET base_snapshot = ? WHERE id = ?',
                        [JSON.stringify(snapshot), proposal.id]);
                }
            }
            await runStatement(database, `INSERT INTO event_sequence (earlier_id, later_id, visibility_direction)
                SELECT earlier_id, later_id, 'both' FROM (
                    SELECT previous_event_id AS earlier_id, id AS later_id FROM events
                        WHERE previous_event_id IS NOT NULL AND previous_event_id <> ''
                    UNION
                    SELECT id AS earlier_id, next_event_id AS later_id FROM events
                        WHERE next_event_id IS NOT NULL AND next_event_id <> ''
                )`);
            await runStatement(database, 'DROP INDEX IF EXISTS idx_events_previous_event_id');
            await runStatement(database, 'DROP INDEX IF EXISTS idx_events_next_event_id');
            await runStatement(database, 'ALTER TABLE events DROP COLUMN previous_event_id');
            await runStatement(database, 'ALTER TABLE events DROP COLUMN next_event_id');
        }
    },
};
