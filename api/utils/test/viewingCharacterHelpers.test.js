/**
 * Tests for viewing-character resolution (the "browse as" character-selection helper)
 */

jest.mock('../../data/authRepository', () => ({
    listAnchoredCharacterIdsByUserId: jest.fn(),
}));

const { listAnchoredCharacterIdsByUserId } = require('../../data/authRepository');
const { VIEWING_CHARACTER_HEADER, resolveViewingCharacterId, getVisibilityAuth } = require('../viewingCharacterHelpers');

function makeReq({ auth, headerValue }) {
    return {
        auth,
        get: (name) => (name.toLowerCase() === VIEWING_CHARACTER_HEADER ? headerValue : undefined),
    };
}

function makeManifestCrudService(character) {
    return {
        getOne: jest.fn().mockResolvedValue(character),
    };
}

describe('resolveViewingCharacterId', () => {
    beforeEach(() => {
        listAnchoredCharacterIdsByUserId.mockReset();
    });

    it('returns null when there is no authenticated user', async () => {
        const req = makeReq({ auth: null, headerValue: 'char-1' });
        const result = await resolveViewingCharacterId(req, makeManifestCrudService(null));
        expect(result).toBeNull();
    });

    it('uses the requested character when it is one of the player\'s anchors', async () => {
        listAnchoredCharacterIdsByUserId.mockResolvedValue(['char-1', 'char-2']);
        const req = makeReq({ auth: { userId: 'u1', role: 'player' }, headerValue: 'char-2' });
        const result = await resolveViewingCharacterId(req, makeManifestCrudService(null));
        expect(result).toBe('char-2');
    });

    it('falls back to the first anchor when the requested character is not anchored to the player', async () => {
        listAnchoredCharacterIdsByUserId.mockResolvedValue(['char-1', 'char-2']);
        const req = makeReq({ auth: { userId: 'u1', role: 'player' }, headerValue: 'someone-elses-char' });
        const result = await resolveViewingCharacterId(req, makeManifestCrudService(null));
        expect(result).toBe('char-1');
    });

    it('falls back to the first anchor when no character is requested', async () => {
        listAnchoredCharacterIdsByUserId.mockResolvedValue(['char-1', 'char-2']);
        const req = makeReq({ auth: { userId: 'u1', role: 'player' }, headerValue: undefined });
        const result = await resolveViewingCharacterId(req, makeManifestCrudService(null));
        expect(result).toBe('char-1');
    });

    it('returns null for a player with no anchored characters', async () => {
        listAnchoredCharacterIdsByUserId.mockResolvedValue([]);
        const req = makeReq({ auth: { userId: 'u1', role: 'player' }, headerValue: 'char-1' });
        const result = await resolveViewingCharacterId(req, makeManifestCrudService(null));
        expect(result).toBeNull();
    });

    it('uses the requested character for a DM when it is a real player character', async () => {
        const manifestCrudService = makeManifestCrudService({ id: 'char-1', player_character: true });
        const req = makeReq({ auth: { userId: 'dm1', role: 'dm' }, headerValue: 'char-1' });
        const result = await resolveViewingCharacterId(req, manifestCrudService);
        expect(result).toBe('char-1');
        expect(manifestCrudService.getOne).toHaveBeenCalledWith('Character', { id: 'char-1' });
    });

    it('returns null (omniscient) for a DM with no requested character', async () => {
        const req = makeReq({ auth: { userId: 'dm1', role: 'dm' }, headerValue: undefined });
        const result = await resolveViewingCharacterId(req, makeManifestCrudService(null));
        expect(result).toBeNull();
    });

    it('returns null for a DM requesting a character that does not exist', async () => {
        const manifestCrudService = makeManifestCrudService(null);
        const req = makeReq({ auth: { userId: 'dm1', role: 'dm' }, headerValue: 'nonexistent' });
        const result = await resolveViewingCharacterId(req, manifestCrudService);
        expect(result).toBeNull();
    });

    it('returns null for a DM requesting a character that is not a player character', async () => {
        const manifestCrudService = makeManifestCrudService({ id: 'npc-1', player_character: false });
        const req = makeReq({ auth: { userId: 'dm1', role: 'dm' }, headerValue: 'npc-1' });
        const result = await resolveViewingCharacterId(req, manifestCrudService);
        expect(result).toBeNull();
    });
});

describe('getVisibilityAuth', () => {
    it('simulates a player role for a DM previewing as a character', () => {
        const auth = { userId: 'dm1', role: 'dm', username: 'gm' };
        const result = getVisibilityAuth(auth, 'char-1');
        expect(result).toEqual({ userId: 'dm1', role: 'player', username: 'gm' });
    });

    it('leaves a DM auth unchanged when no character is selected (omniscient)', () => {
        const auth = { userId: 'dm1', role: 'dm' };
        const result = getVisibilityAuth(auth, null);
        expect(result).toBe(auth);
    });

    it('leaves player auth unchanged', () => {
        const auth = { userId: 'u1', role: 'player' };
        const result = getVisibilityAuth(auth, 'char-1');
        expect(result).toBe(auth);
    });

    it('passes through null/undefined auth for unauthenticated requests', () => {
        expect(getVisibilityAuth(null, null)).toBeNull();
        expect(getVisibilityAuth(undefined, null)).toBeUndefined();
    });
});
