const express = require('express');
const request = require('supertest');

jest.mock('../../data/db', () => ({
    db: new (require('sqlite3').Database)(':memory:'),
}));
jest.mock('../../data/authRepository', () => ({
    listAnchoredCharacterIdsByUserId: jest.fn().mockResolvedValue(['hero']),
    findUserById: jest.fn(),
}));

const { db } = require('../../data/db');
const { listAnchoredCharacterIdsByUserId } = require('../../data/authRepository');
const { manifestCrudService } = require('../../data/genericCrudService');
const { buildAllCreateTableSql } = require('../../data/schemaBuilder');
const { domainManifest } = require('../../../common/domainManifest');
const { runStatement } = require('../../utils/migrationService');
const proposalMigration = require('../../migrations/002-audit-and-proposals');
const domainRouter = require('../domainRouter');

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
    const userId = req.get('x-user') || 'user';
    req.auth = { userId, username: userId, role: req.get('x-role') || 'dm' };
    next();
});
app.use('/api', domainRouter);

beforeAll(async () => {
    for (const sql of buildAllCreateTableSql()) await runStatement(db, sql);
    await runStatement(db, 'CREATE TABLE users (id TEXT PRIMARY KEY)');
    await runStatement(db, "INSERT INTO users (id) VALUES ('user'), ('another-player'), ('dm')");
    await proposalMigration.up(db);
});

beforeEach(async () => {
    listAnchoredCharacterIdsByUserId.mockResolvedValue(['hero']);
    await runStatement(db, 'DELETE FROM edit_proposals');
    for (const relation of Object.values(domainManifest.relations)) {
        await runStatement(db, `DELETE FROM ${relation.table}`);
    }
    for (const entity of Object.values(domainManifest.entities)) {
        await runStatement(db, `DELETE FROM ${entity.table}`);
    }
    for (const id of ['hero', 'other', 'third']) {
        await manifestCrudService.insert('Character', {
            id, name: id, player_character: true, is_public: false,
            deceased: false, short_description: id, intelligence: 10,
        });
    }
    await manifestCrudService.insert('Place', {
        id: 'village', name: 'Village', type: 'town', is_public: false, short_description: 'A village',
    });
});

afterAll(async () => {
    await new Promise((resolve, reject) => db.close(error => error ? reject(error) : resolve()));
});

test('creates from both sides and filters relations by their own direction', async () => {
    const first = await request(app).post('/api/characters/hero/places').send({
        id: 'village', short_description: 'Hero visited',
        timeline: [{ id: 'private', description: 'Private timeline detail', date: null }],
    });
    expect({ status: first.status, body: first.body }).toEqual(expect.objectContaining({ status: 201 }));
    expect(first.body.visibility_direction).toBe('first_to_second');

    const second = await request(app).post('/api/places/village/characters').send({
        id: 'other', short_description: 'Other visited',
    });
    expect(second.status).toBe(201);
    expect(second.body.visibility_direction).toBe('second_to_first');

    const place = await request(app).get('/api/places/village/full').set('x-role', 'player');
    expect(place.status).toBe(200);
    expect(place.body.related.characters.map(record => record.id)).toEqual(['other']);
    expect(JSON.stringify(place.body)).not.toContain('Private timeline detail');
    expect((await request(app).get('/api/characters/other').set('x-role', 'player')).status).toBe(200);
    expect((await request(app).get('/api/places/village/characters/hero').set('x-role', 'player')).status).toBe(404);
    const preview = await request(app).get('/api/places/village/full').set('x-viewing-character', 'hero');
    expect(preview.body.related.characters.map(record => record.id)).toEqual(['other']);

    await manifestCrudService.update('Character', { id: 'hero' }, { intelligence: 3 });
    const limited = await request(app).get('/api/places/village/full').set('x-role', 'player');
    expect(limited.body.related.characters).toEqual([{ id: 'other', name: 'other', locked: true }]);
    await manifestCrudService.update('Character', { id: 'hero' }, { intelligence: 10 });

    const dmPlace = await request(app).get('/api/places/village/full');
    expect(dmPlace.body.related.characters.map(record => record.id).sort()).toEqual(['hero', 'other']);
    const change = await request(app).patch('/api/places/village/characters/hero')
        .send({ visibility_direction: 'both' });
    expect(change.status).toBe(200);
    const updated = await request(app).get('/api/places/village/full').set('x-role', 'player');
    expect(updated.body.related.characters.map(record => record.id).sort()).toEqual(['hero', 'other']);

    const invalid = await request(app).patch('/api/places/village/characters/hero')
        .send({ visibility_direction: 'sideways' });
    expect(invalid.status).toBe(400);
});

test('keeps opposite self-relation rows independently editable', async () => {
    for (const [source, target] of [['hero', 'third'], ['third', 'hero']]) {
        const response = await request(app).post(`/api/characters/${source}/characters`).send({
            id: target, relationship_type: source === 'hero' ? 'friend' : 'rival', short_description: source,
        });
        expect({ status: response.status, body: response.body }).toEqual(expect.objectContaining({ status: 201 }));
    }
    const detail = await request(app).get('/api/characters/hero/full');
    const third = detail.body.related.characters.filter(record => record.id === 'third');
    expect(third.map(record => record.relationship.relationAnchorIndex).sort()).toEqual([0, 1]);
    expect(third.map(record => record.relationship.relationship_type).sort()).toEqual(['friend', 'rival']);
    const response = await request(app)
        .patch('/api/characters/hero/characters/third?anchorMemberIndex=1')
        .send({ visibility_direction: 'both' });
    expect(response.status).toBe(400);
    const first = await manifestCrudService.getOne('CharacterRelationship', {
        character_id: 'hero', related_id: 'third',
    });
    const second = await manifestCrudService.getOne('CharacterRelationship', {
        character_id: 'third', related_id: 'hero',
    });
    expect(first.visibility_direction).toBe('first_to_second');
    expect(second.visibility_direction).toBe('first_to_second');

    const playerDetail = await request(app).get('/api/characters/hero/full').set('x-role', 'player');
    const visible = playerDetail.body.related.characters.filter(record => record.id === 'third');
    expect(visible).toHaveLength(1);
    expect(visible[0].relationship.relationship_type).toBe('friend');
    expect(visible[0].relationship.relationAnchorIndex).toBe(0);
});

test('enforces origin-to-target visibility for character relationships', async () => {
    const invalid = await request(app).post('/api/characters/hero/characters').send({
        id: 'third', relationship_type: 'friend', short_description: 'Friends', visibility_direction: 'both',
    });
    expect(invalid.status).toBe(400);
    const reverse = await request(app).post('/api/characters/hero/characters?anchorMemberIndex=1').send({
        id: 'third', relationship_type: 'rival', short_description: 'A rival',
    });
    expect(reverse.status).toBe(201);
    expect(reverse.body.character_id).toBe('third');
    expect(reverse.body.related_id).toBe('hero');
    expect(reverse.body.visibility_direction).toBe('first_to_second');
    const otherDirection = await request(app)
        .patch('/api/characters/hero/characters/third?anchorMemberIndex=1')
        .send({ visibility_direction: 'second_to_first' });
    expect(otherDirection.status).toBe(400);
});

test('creates an undated connection and edits, reorders and clears its timeline', async () => {
    const created = await request(app).post('/api/characters/hero/places').send({
        id: 'village', short_description: 'Visits the village',
    });
    expect(created.status).toBe(201);
    expect(created.body.timeline).toEqual([]);
    const entries = [
        { id: 'first', description: 'Arrived', date: null },
        { id: 'second', description: 'Returned', date: '0200200001_age-of-descent-default' },
    ];
    const url = '/api/characters/hero/places/village';
    const saved = await request(app).patch(url).send({ timeline: entries });
    expect(saved.status).toBe(200);
    expect(saved.body.record.timeline).toEqual(entries);
    const reordered = await request(app).patch(url).send({ timeline: entries.slice().reverse() });
    expect(reordered.body.record.timeline.map(entry => entry.id)).toEqual(['second', 'first']);
    const full = await request(app).get('/api/characters/hero/full').set('x-role', 'player');
    expect(full.body.related.places[0].relationship.timeline).toEqual(entries.slice().reverse());
    expect((await request(app).patch(url).send({ timeline: [
        { id: 'first', description: 'Invalid', date: 'not-a-date' },
    ] })).status).toBe(400);
    expect((await request(app).patch(url).send({ timeline: [entries[0], entries[0]] })).status).toBe(400);
    const cleared = await request(app).patch(url).send({ timeline: [] });
    expect(cleared.body.record.timeline).toEqual([]);
});

test('players propose timeline replacements for review without changing the accepted timeline', async () => {
    const url = '/api/characters/hero/places/village';
    const original = [
        { id: 'first', description: 'Arrived', date: null },
        { id: 'second', description: 'Returned', date: null },
    ];
    await request(app).post('/api/characters/hero/places').send({
        id: 'village', short_description: 'Visits the village', timeline: original,
    });

    const unchanged = await request(app).post(`${url}/propose`).set('x-role', 'player')
        .send({ timeline: original.map(({ id, description, date }) => ({ date, description, id })) });
    expect(unchanged.status).toBe(400);
    expect(unchanged.body.error).toMatch(/No proposed changes/);
    expect((await request(app).post(`${url}/propose`).set('x-role', 'player')
        .send({ timeline: [original[0], original[0]] })).status).toBe(400);

    const proposed = [original[1], { id: 'third', description: 'Left', date: null }];
    const response = await request(app).post(`${url}/propose`).set('x-role', 'player')
        .send({ timeline: proposed });
    expect(response.status).toBe(201);
    expect(response.body.proposedChanges).toEqual({ timeline: proposed });
    const detail = await request(app).get('/api/characters/hero/full').set('x-role', 'player');
    expect(detail.body.related.places[0].relationship).toMatchObject({
        timeline: original, pendingProposal: { proposedChanges: { timeline: proposed } },
    });
    expect((await request(app).patch(url).send({ timeline: [] })).status).toBe(409);
    expect((await request(app).post(`/api/proposals/${response.body.id}/accept`)).status).toBe(200);
    expect((await request(app).get('/api/characters/hero/full')).body.related.places[0].relationship.timeline)
        .toEqual(proposed);

    const clear = await request(app).post(`${url}/propose`).set('x-role', 'player').send({ timeline: [] });
    expect(clear.status).toBe(201);
    expect((await request(app).post(`/api/proposals/${clear.body.id}/reject`)).status).toBe(200);
    expect((await request(app).get('/api/characters/hero/full')).body.related.places[0].relationship.timeline)
        .toEqual(proposed);
    const clearAgain = await request(app).post(`${url}/propose`).set('x-role', 'player').send({ timeline: [] });
    expect(clearAgain.status).toBe(201);
    expect((await request(app).post(`/api/proposals/${clearAgain.body.id}/accept`)).status).toBe(200);
    expect((await request(app).get('/api/characters/hero/full')).body.related.places[0].relationship.timeline)
        .toEqual([]);
});

test('timeline proposals respect character perspective and player access', async () => {
    await manifestCrudService.update('Character', { id: 'third' }, { player_character: false });
    await request(app).post('/api/characters/hero/characters').send({
        id: 'third', relationship_type: 'friend', short_description: 'Friends',
    });
    await request(app).post('/api/characters/third/characters').send({
        id: 'hero', relationship_type: 'rival', short_description: 'Rivals',
    });
    const entries = [{ id: 'meeting', description: 'Met', date: null }];
    const response = await request(app)
        .post('/api/characters/hero/characters/third/propose?anchorMemberIndex=0')
        .set('x-role', 'player').send({ timeline: entries });
    expect(response.status).toBe(201);
    expect((await request(app).post(`/api/proposals/${response.body.id}/accept`)).status).toBe(200);
    expect((await manifestCrudService.getOne('CharacterRelationship', {
        character_id: 'hero', related_id: 'third',
    })).timeline).toEqual(entries);
    expect((await manifestCrudService.getOne('CharacterRelationship', {
        character_id: 'third', related_id: 'hero',
    })).timeline).toEqual([]);
    expect((await request(app).post('/api/characters/hero/characters/third/propose?anchorMemberIndex=1')
        .set('x-role', 'player').send({ timeline: entries })).status).toBe(404);
    await manifestCrudService.update('Character', { id: 'third' }, { player_character: true });
    const clear = await request(app).post('/api/characters/hero/characters/third/propose?anchorMemberIndex=0')
        .set('x-role', 'player').send({ timeline: [] });
    expect(clear.status).toBe(201);
    expect((await request(app).post(`/api/proposals/${clear.body.id}/accept`)).status).toBe(200);
});

test('players can propose article and timeline edits to their outgoing relationship with another player', async () => {
    for (const [source, target] of [['hero', 'third'], ['third', 'hero'], ['third', 'other']]) {
        expect((await request(app).post(`/api/characters/${source}/characters`).send({
            id: target, relationship_type: 'friend', short_description: source,
        })).status).toBe(201);
    }

    const url = '/api/characters/hero/characters/third/propose?anchorMemberIndex=0';
    const article = await request(app).post(url).set('x-role', 'player')
        .send({ short_description: 'Close friends', long_explanation: 'Their story' });
    expect(article.status).toBe(201);
    expect((await request(app).post(`/api/proposals/${article.body.id}/accept`)).status).toBe(200);

    const timeline = [{ id: 'meeting', description: 'Met', date: null }];
    const proposal = await request(app).post(url).set('x-role', 'player').send({ timeline });
    expect(proposal.status).toBe(201);
    expect((await request(app).post(`/api/proposals/${proposal.body.id}/accept`)).status).toBe(200);
    expect(await manifestCrudService.getOne('CharacterRelationship', {
        character_id: 'hero', related_id: 'third',
    })).toMatchObject({ short_description: 'Close friends', long_explanation: 'Their story', timeline });
    expect(await manifestCrudService.getOne('CharacterRelationship', {
        character_id: 'third', related_id: 'hero',
    })).toMatchObject({ short_description: 'third', timeline: [] });

    expect((await request(app).post('/api/characters/hero/characters/third/propose?anchorMemberIndex=1')
        .set('x-role', 'player').send({ long_explanation: 'Not mine' })).status).toBe(404);
    expect((await request(app).post('/api/characters/third/characters/hero/propose')
        .set('x-role', 'player').send({ long_explanation: 'Not mine' })).status).toBe(403);
    expect((await request(app).post('/api/characters/third/characters/other/propose')
        .set('x-role', 'player').send({ long_explanation: 'Not mine' })).status).toBe(403);
    expect((await request(app).post('/api/characters/third/propose')
        .set('x-role', 'player').send({ long_explanation: 'Not mine' })).status).toBe(403);
    await request(app).post('/api/characters/third/places').send({
        id: 'village', short_description: 'Visited',
    });
    expect((await request(app).post('/api/characters/third/places/village/propose')
        .set('x-role', 'player').send({ long_explanation: 'Not mine' })).status).toBe(403);
});

test('owned outgoing relationships still require a fully visible target', async () => {
    await request(app).post('/api/characters/hero/characters').send({
        id: 'third', relationship_type: 'friend', short_description: 'Friends',
    });
    await manifestCrudService.update('Character', { id: 'hero' }, { intelligence: 1 });
    const response = await request(app).post('/api/characters/hero/characters/third/propose')
        .set('x-role', 'player').send({ timeline: [{ id: 'meeting', description: 'Met', date: null }] });
    expect(response.status).toBe(404);
});

test('relationship ownership is independent of the selected viewing character', async () => {
    listAnchoredCharacterIdsByUserId.mockResolvedValue(['hero', 'other']);
    for (const [source, target] of [['hero', 'other'], ['other', 'third']]) {
        expect((await request(app).post(`/api/characters/${source}/characters`).send({
            id: target, relationship_type: 'friend', short_description: source,
        })).status).toBe(201);
    }
    const proposal = await request(app).post('/api/characters/other/characters/third/propose')
        .set('x-role', 'player').set('x-viewing-character', 'hero')
        .send({ long_explanation: 'Other character perspective' });
    expect(proposal.status).toBe(201);
});

test('keeps timelines separate between character perspectives', async () => {
    for (const [source, target] of [['hero', 'third'], ['third', 'hero']]) {
        await request(app).post(`/api/characters/${source}/characters`).send({
            id: target, relationship_type: 'friend', short_description: source,
        });
    }
    await request(app).patch('/api/characters/hero/characters/third?anchorMemberIndex=0').send({
        timeline: [{ id: 'meeting', description: 'A friendly meeting', date: null }],
    });
    const detail = await request(app).get('/api/characters/hero/full');
    const rows = detail.body.related.characters.filter(record => record.id === 'third');
    expect(rows.find(record => record.relationship.relationAnchorIndex === 0).relationship.timeline).toHaveLength(1);
    expect(rows.find(record => record.relationship.relationAnchorIndex === 1).relationship.timeline).toEqual([]);
});

test('does not expose relation details from a locked source or target', async () => {
    await manifestCrudService.insert('CharacterPlace', {
        character_id: 'hero', place_id: 'village',
        short_description: 'Hero visited', visibility_direction: 'first_to_second',
        timeline: [{ id: 'hidden', description: 'Hidden timeline detail', date: null }],
    });
    await manifestCrudService.update('Character', { id: 'hero' }, { intelligence: 1 });
    const list = await request(app).get('/api/places/village/characters').set('x-role', 'player');
    expect(list.status).toBe(404);
    const specific = await request(app)
        .get('/api/characters/hero/places/village').set('x-role', 'player');
    expect(specific.status).toBe(404);
    const detail = await request(app).get('/api/characters/hero/full').set('x-role', 'player');
    expect(detail.body.related.places).toEqual([{ id: 'village', name: 'Village', locked: true }]);
    expect(JSON.stringify(detail.body)).not.toContain('Hidden timeline detail');
    expect((await request(app).post('/api/characters/hero/places/village/propose').set('x-role', 'player')
        .send({ timeline: [] })).status).toBe(404);
});

test('creates and edits a simple relation from its second member', async () => {
    await manifestCrudService.insert('Event', {
        id: 'festival', name: 'Festival', is_public: false, short_description: 'A festival',
    });
    const created = await request(app).post('/api/places/village/events').send({ id: 'festival' });
    expect(created.status).toBe(201);
    expect(created.body.visibility_direction).toBe('second_to_first');
    const place = await request(app).get('/api/places/village/full');
    expect(place.body.related.events[0].relationship.visibility_direction).toBe('second_to_first');
    const updated = await request(app).patch('/api/places/village/events/festival')
        .send({ visibility_direction: 'both' });
    expect(updated.status).toBe(200);
    expect(updated.body.record.visibility_direction).toBe('both');
});

test('players cannot propose a direction change', async () => {
    await manifestCrudService.insert('CharacterPlace', {
        character_id: 'hero', place_id: 'village',
        short_description: 'Hero visited', visibility_direction: 'first_to_second',
    });
    const response = await request(app)
        .post('/api/characters/hero/places/village/propose')
        .set('x-role', 'player')
        .send({ visibility_direction: 'both' });
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/not player-proposable/);
});

test('authors amend one entity proposal across sections and can revert individual changes', async () => {
    const create = await request(app).post('/api/characters/hero/propose')
        .set('x-role', 'player').send({ short_description: 'New description' });
    expect({ status: create.status, body: create.body }).toEqual(expect.objectContaining({ status: 201 }));
    const proposalId = create.body.id;

    const amend = await request(app).patch('/api/characters/hero/propose')
        .set('x-role', 'player').send({ proposalId, changes: { long_explanation: 'New history' } });
    expect(amend.status).toBe(200);
    expect(amend.body.proposedChanges).toEqual({
        short_description: 'New description', long_explanation: 'New history',
    });
    expect((await manifestCrudService.getOne('Character', { id: 'hero' })).short_description).toBe('hero');
    expect((await request(app).patch('/api/characters/hero').send({ name: 'Blocked' })).status).toBe(409);

    const clear = await request(app).patch('/api/characters/hero/propose')
        .set('x-role', 'player').send({ proposalId, changes: { long_explanation: null } });
    expect(clear.body.proposedChanges).toEqual({ short_description: 'New description' });
    await request(app).patch('/api/characters/hero/propose')
        .set('x-role', 'player').send({ proposalId, changes: { long_explanation: 'New history' } });

    const revert = await request(app).patch('/api/characters/hero/propose')
        .set('x-role', 'player').send({ proposalId, changes: { short_description: 'hero' } });
    expect(revert.body.proposedChanges).toEqual({ long_explanation: 'New history' });

    const accept = await request(app).post(`/api/proposals/${proposalId}/accept`);
    expect(accept.status).toBe(200);
    const record = await manifestCrudService.getOne('Character', { id: 'hero' });
    expect(record.short_description).toBe('hero');
    expect(record.long_explanation).toBe('New history');
    const stale = await request(app).patch('/api/characters/hero/propose')
        .set('x-role', 'player').send({ proposalId, changes: { name: 'Too late' } });
    expect(stale.status).toBe(409);
});

test('only the author can amend, and reverting the last change withdraws the proposal', async () => {
    const create = await request(app).post('/api/characters/hero/propose')
        .set('x-role', 'player').send({ short_description: 'Proposed' });
    const proposalId = create.body.id;
    const other = await request(app).patch('/api/characters/hero/propose')
        .set('x-role', 'player').set('x-user', 'another-player')
        .send({ proposalId, changes: { short_description: 'Other' } });
    expect(other.status).toBe(403);
    const forbiddenField = await request(app).patch('/api/characters/hero/propose')
        .set('x-role', 'player').send({ proposalId, changes: { is_public: true } });
    expect(forbiddenField.status).toBe(400);

    const revert = await request(app).patch('/api/characters/hero/propose')
        .set('x-role', 'player').send({ proposalId, changes: { short_description: 'hero' } });
    expect(revert.status).toBe(200);
    expect(revert.body).toBeNull();
    expect((await request(app).patch('/api/characters/hero').send({ name: 'Unlocked' })).status).toBe(200);
    expect((await request(app).patch('/api/characters/hero/propose')
        .set('x-role', 'player').send({ proposalId, changes: { name: 'Stale' } })).status).toBe(409);
});

test('conditional amendments reject proposals changed or resolved since they were read', async () => {
    const { getPendingProposalForTarget, amendPendingProposal, markRejected } = require('../../data/editProposalRepository');
    await request(app).post('/api/characters/hero/propose')
        .set('x-role', 'player').send({ short_description: 'Proposed' });
    const original = await getPendingProposalForTarget('Character', { id: 'hero' });
    const first = await amendPendingProposal(original, { short_description: 'Amended' });
    expect(first.proposed_changes).toEqual({ short_description: 'Amended' });
    expect(await amendPendingProposal(original, { short_description: 'Outdated' })).toBeNull();
    await markRejected(first.id, { reviewedBy: 'dm', reviewedAt: new Date().toISOString() });
    expect(await amendPendingProposal(first, { short_description: 'Too late' })).toBeNull();
});

test('acceptance and amendments serialize so acceptance applies the latest proposal', async () => {
    const { getPendingProposalForTarget, amendPendingProposal, acceptPendingProposal } = require('../../data/editProposalRepository');
    const create = await request(app).post('/api/characters/hero/propose')
        .set('x-role', 'player').send({ short_description: 'Original proposal' });
    const original = await getPendingProposalForTarget('Character', { id: 'hero' });

    let startApplying;
    const applying = new Promise(resolve => { startApplying = resolve; });
    let releaseApply;
    const applyGate = new Promise(resolve => { releaseApply = resolve; });
    const acceptance = acceptPendingProposal(create.body.id, {
        reviewedBy: 'dm',
        reviewedAt: new Date().toISOString(),
    }, async proposal => {
        startApplying();
        await applyGate;
        await manifestCrudService.update('Character', { id: 'hero' }, proposal.proposed_changes);
    });

    await applying;
    let amendmentFinished = false;
    const amendment = amendPendingProposal(original, { short_description: 'Amended proposal' })
        .then(result => {
            amendmentFinished = true;
            return result;
        });
    await Promise.resolve();
    expect(amendmentFinished).toBe(false);

    releaseApply();
    const [accepted, amended] = await Promise.all([acceptance, amendment]);
    expect(accepted.kind).toBe('accepted');
    expect(accepted.proposal.proposed_changes).toEqual({ short_description: 'Original proposal' });
    expect(amended).toBeNull();
    expect((await manifestCrudService.getOne('Character', { id: 'hero' })).short_description)
        .toBe('Original proposal');
});
