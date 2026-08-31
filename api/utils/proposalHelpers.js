const { manifestCrudService } = require('../data/genericCrudService');
const { domainManifest } = require('../../common/domainManifest');
const { getRelationMembers } = require('./manifestHelpers');

/**
 * Generate a simple proposal ID
 */
function generateProposalId() {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 8);
    return `proposal-${timestamp}-${randomPart}`;
}

/**
 * Creates a field-edit proposal for a player's suggested change
 */
async function createFieldEditProposal(userId, entityRoute, entityId, fieldName, oldValue, newValue) {
    const proposalId = generateProposalId();

    const proposal = {
        id: proposalId,
        proposed_by_user_id: userId,
        entity_route: entityRoute,
        entity_id: entityId,
        relation_name: null,
        relation_member_ids: null,
        field_name: fieldName,
        old_value: oldValue === undefined ? null : JSON.stringify(oldValue),
        new_value: JSON.stringify(newValue),
        proposal_type: 'field-edit',
        status: 'pending',
        rejected_reason: null,
        created_at: new Date().toISOString(),
        reviewed_by_user_id: null,
        reviewed_at: null,
    };

    await manifestCrudService.insert('edit_proposals', proposal);
    return proposal;
}

/**
 * Creates a relation-creation proposal for a player's suggested new relation
 */
async function createRelationProposal(userId, entityRoute, relationName, memberIds, proposedPayload) {
    const proposalId = generateProposalId();

    const proposal = {
        id: proposalId,
        proposed_by_user_id: userId,
        entity_route: entityRoute,
        entity_id: memberIds[0], // First member ID
        relation_name: relationName,
        relation_member_ids: JSON.stringify(memberIds),
        field_name: relationName,
        old_value: null,
        new_value: JSON.stringify(proposedPayload),
        proposal_type: 'relation-create',
        status: 'pending',
        rejected_reason: null,
        created_at: new Date().toISOString(),
        reviewed_by_user_id: null,
        reviewed_at: null,
    };

    await manifestCrudService.insert('edit_proposals', proposal);
    return proposal;
}

/**
 * Approves a proposal and applies the change to the entity/relation
 */
async function approveProposal(proposalId, dmUserId) {
    const proposal = await manifestCrudService.getOne('edit_proposals', { id: proposalId });

    if (!proposal) {
        throw new Error(`Proposal not found: ${proposalId}`);
    }

    if (proposal.status !== 'pending') {
        throw new Error(`Proposal is not pending: ${proposalId}`);
    }

    try {
        if (proposal.proposal_type === 'field-edit') {
            // Apply field edit to entity
            const newValue = JSON.parse(proposal.new_value);
            const entityName = proposal.entity_route.charAt(0).toUpperCase() + proposal.entity_route.slice(1).replace(/s$/, '');

            // Determine the ID field name (typically 'id' but could be route-specific)
            const { getEntityByRoute } = require('./manifestHelpers');
            const { entityDef } = getEntityByRoute(proposal.entity_route);
            const idField = entityDef.idField;

            await manifestCrudService.update(entityName, {
                [idField]: proposal.entity_id,
            }, {
                [proposal.field_name]: newValue,
            });
        } else if (proposal.proposal_type === 'relation-create') {
            const relationDef = domainManifest.relations[proposal.relation_name];
            if (!relationDef) {
                throw new Error(`Unknown relation: ${proposal.relation_name}`);
            }

            const memberIds = JSON.parse(proposal.relation_member_ids);
            const { updates, historyValue } = JSON.parse(proposal.new_value);
            const members = getRelationMembers(relationDef);
            const where = Object.fromEntries(members.map((member, index) => [member.key, memberIds[index]]));

            if (relationDef.historyKey) {
                where[relationDef.historyKey] = historyValue;
            }

            const result = await manifestCrudService.update(proposal.relation_name, where, updates);
            if (result.updated === 0 && !result.record) {
                throw new Error('Relation record not found');
            }
        }

        // Mark proposal as approved
        await manifestCrudService.update('edit_proposals', { id: proposalId }, {
            status: 'approved',
            reviewed_by_user_id: dmUserId,
            reviewed_at: new Date().toISOString(),
        });

        return await manifestCrudService.getOne('edit_proposals', { id: proposalId });
    } catch (err) {
        throw new Error(`Failed to approve proposal: ${err.message}`);
    }
}

/**
 * Rejects a proposal
 */
async function rejectProposal(proposalId, dmUserId, reason = null) {
    const proposal = await manifestCrudService.getOne('edit_proposals', { id: proposalId });

    if (!proposal) {
        throw new Error(`Proposal not found: ${proposalId}`);
    }

    if (proposal.status !== 'pending') {
        throw new Error(`Proposal is not pending: ${proposalId}`);
    }

    await manifestCrudService.update('edit_proposals', { id: proposalId }, {
        status: 'rejected',
        rejected_reason: reason,
        reviewed_by_user_id: dmUserId,
        reviewed_at: new Date().toISOString(),
    });

    return await manifestCrudService.getOne('edit_proposals', { id: proposalId });
}

/**
 * Gets all pending proposals (DM inbox)
 */
async function getPendingProposals() {
    return manifestCrudService.getMany('edit_proposals', { status: 'pending' });
}

/**
 * Gets all proposals for a specific entity
 */
async function getProposalsForEntity(entityRoute, entityId, status = null) {
    const where = {
        entity_route: entityRoute,
        entity_id: entityId,
    };

    if (status) {
        where.status = status;
    }

    return manifestCrudService.getMany('edit_proposals', where);
}

/**
 * Gets all proposals submitted by a user
 */
async function getProposalsByUser(userId, status = null, limit = 50) {
    const proposals = await manifestCrudService.getMany('edit_proposals', {
        proposed_by_user_id: userId,
    });

    let filtered = proposals;
    if (status) {
        filtered = proposals.filter((p) => p.status === status);
    }

    return filtered.slice(0, limit);
}

/**
 * Gets stats on proposals
 */
async function getProposalStats() {
    const allProposals = await manifestCrudService.getMany('edit_proposals', {});

    return {
        total: allProposals.length,
        pending: allProposals.filter((p) => p.status === 'pending').length,
        approved: allProposals.filter((p) => p.status === 'approved').length,
        rejected: allProposals.filter((p) => p.status === 'rejected').length,
    };
}

module.exports = {
    createFieldEditProposal,
    createRelationProposal,
    approveProposal,
    rejectProposal,
    getPendingProposals,
    getProposalsForEntity,
    getProposalsByUser,
    getProposalStats,
};
