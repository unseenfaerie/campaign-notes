const express = require('express');
const { domainManifest } = require('../../common/domainManifest');
const { buildEntityFormSchemas, buildRelationFormSchemas } = require('../utils/manifestHelpers');
const { DAYS_PER_YEAR, ERAS, CALENDARS } = require('../../common/dateSystem');
const {
    getPendingProposals,
    getProposalsByUser,
    getProposalStats,
    approveProposal,
    rejectProposal,
} = require('../utils/proposalHelpers');
const { manifestCrudService } = require('../data/genericCrudService');

const router = express.Router();

function isDm(auth) {
    return auth && auth.role === 'dm';
}

router.get('/', (req, res) => {
    res.json({
        ...buildEntityFormSchemas(),
        relationsByEntityRoute: buildRelationFormSchemas(domainManifest),
        dateSystem: {
            daysPerYear: DAYS_PER_YEAR,
            eras: ERAS,
            calendars: Object.values(CALENDARS),
        },
    });
});

// Get all pending proposals (DM only)
router.get('/edit-proposals', async (req, res) => {
    try {
        if (!req.auth || !isDm(req.auth)) {
            return res.status(403).json({ error: 'Only DMs can view edit proposals' });
        }

        const status = req.query.status || 'pending';
        const proposals = await manifestCrudService.getMany('edit_proposals', { status });

        return res.json({
            proposals,
            count: proposals.length,
        });
    } catch (err) {
        console.error('Error fetching proposals:', err);
        return res.status(500).json({ error: err.message });
    }
});

// Get user's proposals
router.get('/edit-proposals/by-user/:userId', async (req, res) => {
    try {
        if (!req.auth) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const userId = req.params.userId;
        // Players can only see their own proposals
        if (!isDm(req.auth) && req.auth.userId !== userId) {
            return res.status(403).json({ error: 'Cannot view other users proposals' });
        }

        const status = req.query.status;
        const limit = parseInt(req.query.limit, 10) || 50;

        const proposals = await getProposalsByUser(userId, status, limit);

        return res.json({
            proposals,
            count: proposals.length,
        });
    } catch (err) {
        console.error('Error fetching user proposals:', err);
        return res.status(500).json({ error: err.message });
    }
});

// Get proposal stats (DM only)
router.get('/edit-proposals-stats', async (req, res) => {
    try {
        if (!req.auth || !isDm(req.auth)) {
            return res.status(403).json({ error: 'Only DMs can view proposal stats' });
        }

        const stats = await getProposalStats();
        return res.json(stats);
    } catch (err) {
        console.error('Error fetching proposal stats:', err);
        return res.status(500).json({ error: err.message });
    }
});

// Approve or reject a proposal (DM only)
router.patch('/edit-proposals/:proposalId', async (req, res) => {
    try {
        if (!req.auth || !isDm(req.auth)) {
            return res.status(403).json({ error: 'Only DMs can review edit proposals' });
        }

        const { proposalId } = req.params;
        const { action, reason } = req.body;

        if (action === 'approve') {
            const proposal = await approveProposal(proposalId, req.auth.userId);
            return res.json({
                message: 'Proposal approved',
                proposal,
            });
        } else if (action === 'reject') {
            const proposal = await rejectProposal(proposalId, req.auth.userId, reason);
            return res.json({
                message: 'Proposal rejected',
                proposal,
            });
        } else {
            return res.status(400).json({ error: 'Invalid action. Must be "approve" or "reject"' });
        }
    } catch (err) {
        console.error('Error reviewing proposal:', err);
        return res.status(500).json({ error: err.message });
    }
});

module.exports = router;
