/**
 * Resolves which single character a request is "browsing as" for read-visibility purposes.
 *
 * Players can only browse as one of their own anchored characters (falling back to their
 * first anchor if none is requested/valid). DMs can browse as any player character to preview
 * that character's perspective, or omit selection entirely for full omniscience. In either case
 * the selection only affects read visibility, never mutation permissions.
 */

const { listAnchoredCharacterIdsByUserId } = require('../data/authRepository');

const VIEWING_CHARACTER_HEADER = 'x-viewing-character';

function getRequestedViewingCharacterId(req) {
    const raw = typeof req.get === 'function' ? req.get(VIEWING_CHARACTER_HEADER) : req.headers[VIEWING_CHARACTER_HEADER];
    return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

/**
 * Resolve and validate the viewing character id for this request against real data.
 * Never trusts the requested header value without checking it belongs to the user (player)
 * or is a genuine player character (DM).
 *
 * @param {object} req - the express request (with req.auth already populated)
 * @param {object} manifestCrudService - the CRUD service for database access
 * @returns {Promise<string|null>} the resolved viewing character id, or null for omniscience/none
 */
async function resolveViewingCharacterId(req, manifestCrudService) {
    if (!req.auth || !req.auth.userId) {
        return null;
    }

    const requestedId = getRequestedViewingCharacterId(req);

    if (req.auth.role === 'player') {
        const anchoredCharacterIds = await listAnchoredCharacterIdsByUserId(req.auth.userId);
        if (requestedId && anchoredCharacterIds.includes(requestedId)) {
            return requestedId;
        }
        return anchoredCharacterIds.length > 0 ? anchoredCharacterIds[0] : null;
    }

    if (req.auth.role === 'dm') {
        if (!requestedId) {
            return null;
        }
        const character = await manifestCrudService.getOne('Character', { id: requestedId });
        return character && character.player_character === true ? requestedId : null;
    }

    return null;
}

/**
 * Build the auth object to use for READ visibility checks: when a DM has selected a character
 * to preview as, simulate the 'player' role so existing hop-limited visibility logic applies.
 * Mutation/permission checks must keep using the real req.auth, not this simulated object.
 *
 * @param {object} auth - the real req.auth (or null/undefined)
 * @param {string|null} viewingCharacterId - the resolved viewing character id
 * @returns {object|null|undefined}
 */
function getVisibilityAuth(auth, viewingCharacterId) {
    if (auth && auth.role === 'dm' && viewingCharacterId) {
        return { ...auth, role: 'player' };
    }
    return auth;
}

module.exports = {
    VIEWING_CHARACTER_HEADER,
    resolveViewingCharacterId,
    getVisibilityAuth,
};
