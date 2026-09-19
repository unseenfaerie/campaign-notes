const { run, get, all } = require('./sqliteAsync');
const { stableStringify } = require('../utils/proposalHelpers');

async function createProposal({
    targetKind,
    resourceName,
    targetKey,
    baseSnapshot,
    proposedChanges,
    proposedBy,
    proposedAt,
}) {
    const result = await run(
        `INSERT INTO edit_proposals
            (target_kind, resource_name, target_key, base_snapshot, proposed_changes, status, proposed_by, proposed_at)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
        [
            targetKind,
            resourceName,
            stableStringify(targetKey),
            JSON.stringify(baseSnapshot),
            JSON.stringify(proposedChanges),
            proposedBy,
            proposedAt,
        ]
    );

    return getProposalById(result.lastID);
}

function deserializeProposal(row) {
    if (!row) return null;

    return {
        ...row,
        target_key: JSON.parse(row.target_key),
        base_snapshot: JSON.parse(row.base_snapshot),
        proposed_changes: JSON.parse(row.proposed_changes),
    };
}

async function getProposalById(id) {
    const row = await get('SELECT * FROM edit_proposals WHERE id = ?', [id]);
    return deserializeProposal(row);
}

async function getPendingProposalForTarget(resourceName, targetKey) {
    const row = await get(
        `SELECT * FROM edit_proposals
         WHERE resource_name = ? AND target_key = ? AND status = 'pending'
         LIMIT 1`,
        [resourceName, stableStringify(targetKey)]
    );
    return deserializeProposal(row);
}

async function getPendingProposalsForResource(resourceName) {
    const rows = await all(
        `SELECT * FROM edit_proposals WHERE resource_name = ? AND status = 'pending'`,
        [resourceName]
    );
    return rows.map(deserializeProposal);
}

async function getPendingProposals() {
    const rows = await all(
        `SELECT * FROM edit_proposals WHERE status = 'pending' ORDER BY proposed_at ASC`
    );
    return rows.map(deserializeProposal);
}

async function markAccepted(id, { reviewedBy, reviewedAt }) {
    await run(
        `UPDATE edit_proposals SET status = 'accepted', reviewed_by = ?, reviewed_at = ? WHERE id = ?`,
        [reviewedBy, reviewedAt, id]
    );
    return getProposalById(id);
}

async function markRejected(id, { reviewedBy, reviewedAt, reviewNote }) {
    await run(
        `UPDATE edit_proposals SET status = 'rejected', reviewed_by = ?, reviewed_at = ?, review_note = ? WHERE id = ?`,
        [reviewedBy, reviewedAt, reviewNote || null, id]
    );
    return getProposalById(id);
}

module.exports = {
    createProposal,
    getProposalById,
    getPendingProposalForTarget,
    getPendingProposalsForResource,
    getPendingProposals,
    markAccepted,
    markRejected,
};
