/**
 * Tests for visibility filtering helpers
 */

const {
    isDm,
    isAnchoredCharacter,
    isEntityPublic,
    isEntityVisibleToUser,
    isRelationVisibleToUser,
    filterEntitiesByVisibility,
} = require('../../utils/visibilityHelpers');

describe('visibilityHelpers', () => {
    describe('isDm', () => {
        it('should return true for user with dm role', () => {
            const user = { role: 'dm', userId: '1' };
            expect(isDm(user)).toBe(true);
        });

        it('should return false for player role', () => {
            const user = { role: 'player', userId: '1' };
            expect(isDm(user)).toBe(false);
        });

        it('should return false for viewer role', () => {
            const user = { role: 'viewer', userId: '1' };
            expect(isDm(user)).toBe(false);
        });

        it('should return false for null user', () => {
            expect(isDm(null)).toBe(false);
        });

        it('should return false for undefined user', () => {
            expect(isDm(undefined)).toBe(false);
        });
    });

    describe('isAnchoredCharacter', () => {
        it('should return true for character in anchored list', () => {
            const anchorIds = ['char-1', 'char-2'];
            expect(isAnchoredCharacter('characters', 'char-1', anchorIds)).toBe(true);
        });

        it('should return false for character not in anchored list', () => {
            const anchorIds = ['char-1', 'char-2'];
            expect(isAnchoredCharacter('characters', 'char-3', anchorIds)).toBe(false);
        });

        it('should return false for non-character entity', () => {
            const anchorIds = ['deity-1'];
            expect(isAnchoredCharacter('deities', 'deity-1', anchorIds)).toBe(false);
        });

        it('should handle empty anchored list', () => {
            expect(isAnchoredCharacter('characters', 'char-1', [])).toBe(false);
        });

        it('should handle undefined anchored list', () => {
            expect(isAnchoredCharacter('characters', 'char-1')).toBe(false);
        });
    });

    describe('isEntityPublic', () => {
        it('should return true for public entity objects', () => {
            expect(isEntityPublic({ id: 'deity-1', is_public: true })).toBe(true);
            expect(isEntityPublic({ id: 'org-1', is_public: true })).toBe(true);
            expect(isEntityPublic({ id: 'place-1', is_public: true })).toBe(true);
        });

        it('should return false for non-public entity objects', () => {
            expect(isEntityPublic({ id: 'char-1', is_public: false })).toBe(false);
            expect(isEntityPublic({ id: 'item-1', is_public: false })).toBe(false);
            expect(isEntityPublic({ id: 'event-1', is_public: false })).toBe(false);
        });

        it('should return false when is_public is missing', () => {
            expect(isEntityPublic({ id: 'entity-1' })).toBe(false);
        });

        it('should handle null entity', () => {
            expect(isEntityPublic(null)).toBe(false);
        });
    });

    describe('isEntityVisibleToUser', () => {
        const publicEntity = { id: 'entity-1', is_public: true };
        const privateEntity = { id: 'entity-2', is_public: false };

        describe('DM visibility', () => {
            it('should see all entities regardless of public status', () => {
                const dmUser = { role: 'dm' };
                expect(isEntityVisibleToUser(publicEntity, 'deities', dmUser, [])).toBe(true);
                expect(isEntityVisibleToUser(privateEntity, 'characters', dmUser, [])).toBe(true);
            });

            it('should see private entities without anchors', () => {
                const dmUser = { role: 'dm' };
                expect(isEntityVisibleToUser(privateEntity, 'items', dmUser, [])).toBe(true);
            });
        });

        describe('Player visibility', () => {
            const playerUser = { role: 'player' };

            it('should see anchored characters (entities route)', () => {
                const anchorIds = ['char-1', 'char-2'];
                const anchoredChar = { id: 'char-1', is_public: false };
                expect(isEntityVisibleToUser(anchoredChar, 'characters', playerUser, anchorIds)).toBe(true);
            });

            it('should not see unanchored characters', () => {
                const anchorIds = ['char-1'];
                const unanchoredChar = { id: 'char-3', is_public: false };
                expect(isEntityVisibleToUser(unanchoredChar, 'characters', playerUser, anchorIds)).toBe(false);
            });

            it('should see public entities', () => {
                const anchorIds = [];
                expect(isEntityVisibleToUser(publicEntity, 'deities', playerUser, anchorIds)).toBe(true);
                expect(isEntityVisibleToUser(publicEntity, 'places', playerUser, anchorIds)).toBe(true);
                expect(isEntityVisibleToUser(publicEntity, 'organizations', playerUser, anchorIds)).toBe(true);
            });

            it('should not see non-public unanchored entities', () => {
                const anchorIds = [];
                expect(isEntityVisibleToUser(privateEntity, 'items', playerUser, anchorIds)).toBe(false);
                expect(isEntityVisibleToUser(privateEntity, 'events', playerUser, anchorIds)).toBe(false);
            });

            it('should see public versions of anchored entity types (non-character)', () => {
                const anchorIds = [];
                const publicDeity = { id: 'deity-1', is_public: true };
                expect(isEntityVisibleToUser(publicDeity, 'deities', playerUser, anchorIds)).toBe(true);
            });
        });

        describe('Viewer visibility', () => {
            const viewerUser = { role: 'viewer' };

            it('should see only public entities', () => {
                expect(isEntityVisibleToUser(publicEntity, 'deities', viewerUser, [])).toBe(true);
                expect(isEntityVisibleToUser(publicEntity, 'places', viewerUser, [])).toBe(true);
            });

            it('should not see any private entities', () => {
                expect(isEntityVisibleToUser(privateEntity, 'characters', viewerUser, [])).toBe(false);
                expect(isEntityVisibleToUser(privateEntity, 'items', viewerUser, [])).toBe(false);
            });

            it('should not see even anchored private entities', () => {
                const anchorIds = ['char-1'];
                const privateChar = { id: 'char-1', is_public: false };
                expect(isEntityVisibleToUser(privateChar, 'characters', viewerUser, anchorIds)).toBe(false);
            });
        });

        describe('Null user visibility', () => {
            it('should see only public entities with null user', () => {
                expect(isEntityVisibleToUser(publicEntity, 'deities', null, [])).toBe(true);
                expect(isEntityVisibleToUser(privateEntity, 'items', null, [])).toBe(false);
            });
        });
    });

    describe('isRelationVisibleToUser', () => {
        const publicMember1 = { id: 'deity-1', is_public: true };
        const publicMember2 = { id: 'sphere-1', is_public: true };
        const privateMember1 = { id: 'char-1', is_public: false };
        const privateMember2 = { id: 'item-1', is_public: false };

        describe('DM visibility', () => {
            it('should see all relations regardless of member visibility', () => {
                const dmUser = { role: 'dm' };
                expect(isRelationVisibleToUser('DeitySphere', [publicMember1, publicMember2], dmUser, [])).toBe(true);
                expect(isRelationVisibleToUser('CharacterItem', [privateMember1, privateMember2], dmUser, [])).toBe(true);
                expect(isRelationVisibleToUser('EventCharacter', [publicMember1, privateMember1], dmUser, [])).toBe(true);
            });
        });

        describe('Player visibility', () => {
            const playerUser = { role: 'player' };

            it('should see relation if both members are visible', () => {
                expect(isRelationVisibleToUser('DeitySphere', [publicMember1, publicMember2], playerUser, [])).toBe(true);
            });

            it('should not see relation if one member is private', () => {
                expect(isRelationVisibleToUser('EventCharacter', [publicMember1, privateMember1], playerUser, [])).toBe(false);
            });

            it('should not see relation if both members are private', () => {
                expect(isRelationVisibleToUser('CharacterItem', [privateMember1, privateMember2], playerUser, [])).toBe(false);
            });

            it('should see relation with anchored private character', () => {
                const anchorIds = ['char-1'];
                expect(isRelationVisibleToUser('CharacterDeity', [privateMember1, publicMember1], playerUser, anchorIds)).toBe(true);
            });
        });

        describe('Viewer visibility', () => {
            const viewerUser = { role: 'viewer' };

            it('should see relation only if both members are public', () => {
                expect(isRelationVisibleToUser('DeitySphere', [publicMember1, publicMember2], viewerUser, [])).toBe(true);
            });

            it('should not see relation if any member is private', () => {
                expect(isRelationVisibleToUser('EventCharacter', [publicMember1, privateMember1], viewerUser, [])).toBe(false);
                expect(isRelationVisibleToUser('CharacterItem', [privateMember1, privateMember2], viewerUser, [])).toBe(false);
            });
        });

        describe('Null user visibility', () => {
            it('should see relation only if both members are public', () => {
                expect(isRelationVisibleToUser('DeitySphere', [publicMember1, publicMember2], null, [])).toBe(true);
                expect(isRelationVisibleToUser('EventCharacter', [publicMember1, privateMember1], null, [])).toBe(false);
            });
        });
    });

    describe('filterEntitiesByVisibility', () => {
        const entities = [
            { id: 'public-1', is_public: true },
            { id: 'private-1', is_public: false },
            { id: 'public-2', is_public: true },
            { id: 'private-2', is_public: false },
        ];

        describe('DM filtering', () => {
            it('should return all entities for DM', () => {
                const dmUser = { role: 'dm' };
                const result = filterEntitiesByVisibility(entities, 'deities', dmUser, []);
                expect(result).toHaveLength(4);
                expect(result).toEqual(entities);
            });
        });

        describe('Player filtering', () => {
            it('should return only public entities when no anchors', () => {
                const playerUser = { role: 'player' };
                const result = filterEntitiesByVisibility(entities, 'deities', playerUser, []);
                expect(result).toHaveLength(2);
                expect(result.every(e => e.is_public === true)).toBe(true);
            });

            it('should return public + anchored entities for characters', () => {
                const playerUser = { role: 'player' };
                const anchorIds = ['private-1'];
                const characters = [
                    { id: 'public-char', is_public: true },
                    { id: 'private-1', is_public: false },
                    { id: 'private-3', is_public: false },
                ];
                const result = filterEntitiesByVisibility(characters, 'characters', playerUser, anchorIds);
                expect(result).toHaveLength(2);
                expect(result.some(e => e.id === 'public-char')).toBe(true);
                expect(result.some(e => e.id === 'private-1')).toBe(true);
                expect(result.some(e => e.id === 'private-3')).toBe(false);
            });
        });

        describe('Viewer filtering', () => {
            it('should return only public entities for viewer', () => {
                const viewerUser = { role: 'viewer' };
                const result = filterEntitiesByVisibility(entities, 'items', viewerUser, []);
                expect(result).toHaveLength(2);
                expect(result.every(e => e.is_public === true)).toBe(true);
            });

            it('should not include anchored private entities for viewer', () => {
                const viewerUser = { role: 'viewer' };
                const anchorIds = ['private-1'];
                const result = filterEntitiesByVisibility(entities, 'characters', viewerUser, anchorIds);
                expect(result).toHaveLength(2);
                expect(result.every(e => e.is_public === true)).toBe(true);
            });
        });

        describe('Null user filtering', () => {
            it('should return only public entities for null user', () => {
                const result = filterEntitiesByVisibility(entities, 'places', null, []);
                expect(result).toHaveLength(2);
                expect(result.every(e => e.is_public === true)).toBe(true);
            });
        });

        describe('Empty entity list', () => {
            it('should handle empty list', () => {
                const playerUser = { role: 'player' };
                const result = filterEntitiesByVisibility([], 'deities', playerUser, []);
                expect(result).toHaveLength(0);
            });
        });
    });
});
