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
    isEntityRelatedToAnchoredCharacter,
    getVisibleEntityIdsForUser,
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

            it('should not see relation if one member is private and not anchored', () => {
                expect(isRelationVisibleToUser('EventCharacter', [publicMember1, privateMember1], playerUser, [])).toBe(false);
            });

            it('should not see relation if both members are private', () => {
                expect(isRelationVisibleToUser('CharacterItem', [privateMember1, privateMember2], playerUser, [])).toBe(false);
            });

            it('should see relation with anchored private character', () => {
                const anchorIds = ['char-1'];
                expect(isRelationVisibleToUser('CharacterDeity', [privateMember1, publicMember1], playerUser, anchorIds)).toBe(true);
            });

            it('should see relation if first member is anchored (even if second is private)', () => {
                const anchorIds = ['char-1'];
                expect(isRelationVisibleToUser('CharacterItem', [privateMember1, privateMember2], playerUser, anchorIds)).toBe(true);
            });

            it('should see relation if second member is anchored (even if first is private)', () => {
                const otherPrivateMember = { id: 'char-2', is_public: false };
                const anchorIds = ['char-2'];
                expect(isRelationVisibleToUser('CharacterRelationship', [privateMember1, otherPrivateMember], playerUser, anchorIds)).toBe(true);
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

    describe('isEntityRelatedToAnchoredCharacter', () => {
        it('should return false if no anchored character IDs provided', async () => {
            const mockCrudService = { getOne: jest.fn() };
            const result = await isEntityRelatedToAnchoredCharacter(mockCrudService, 'places', 'place-1', []);
            expect(result).toBe(false);
            expect(mockCrudService.getOne).not.toHaveBeenCalled();
        });

        it('should return false if null anchored character IDs', async () => {
            const mockCrudService = { getOne: jest.fn() };
            const result = await isEntityRelatedToAnchoredCharacter(mockCrudService, 'places', 'place-1', null);
            expect(result).toBe(false);
            expect(mockCrudService.getOne).not.toHaveBeenCalled();
        });

        it('should return false if invalid entity route', async () => {
            const mockCrudService = { getOne: jest.fn() };
            const result = await isEntityRelatedToAnchoredCharacter(mockCrudService, 'invalid-route', 'place-1', ['char-1']);
            expect(result).toBe(false);
            expect(mockCrudService.getOne).not.toHaveBeenCalled();
        });

        it('should return true if entity is related to an anchored character', async () => {
            const mockCrudService = {
                getOne: jest.fn().mockResolvedValue({ character_id: 'char-1', place_id: 'place-1' }),
            };
            const result = await isEntityRelatedToAnchoredCharacter(mockCrudService, 'places', 'place-1', ['char-1']);
            expect(result).toBe(true);
            expect(mockCrudService.getOne).toHaveBeenCalled();
        });

        it('should return false if entity is not related to any anchored character', async () => {
            const mockCrudService = {
                getOne: jest.fn().mockResolvedValue(null),
            };
            const result = await isEntityRelatedToAnchoredCharacter(mockCrudService, 'places', 'place-1', ['char-1']);
            expect(result).toBe(false);
            expect(mockCrudService.getOne).toHaveBeenCalled();
        });

        it('should check multiple anchored characters', async () => {
            const mockCrudService = {
                getOne: jest.fn()
                    .mockResolvedValueOnce(null)  // char-1 has no relation
                    .mockResolvedValueOnce({ character_id: 'char-2', item_id: 'item-1' }),  // char-2 has relation
            };
            const result = await isEntityRelatedToAnchoredCharacter(mockCrudService, 'items', 'item-1', ['char-1', 'char-2']);
            expect(result).toBe(true);
            expect(mockCrudService.getOne).toHaveBeenCalledTimes(2);
        });
    });

    describe('getVisibleEntityIdsForUser with hop limits', () => {
        it('should return empty set for user with no anchored characters', async () => {
            const mockCrudService = {};
            const result = await getVisibleEntityIdsForUser(mockCrudService, []);
            expect(result).toEqual(new Set());
        });

        it('should return anchored characters at hop depth 0 with no expansion', async () => {
            const mockCrudService = {
                getMany: jest.fn().mockResolvedValue([]),
            };
            const anchoredIds = ['char-1', 'char-2'];
            const result = await getVisibleEntityIdsForUser(mockCrudService, anchoredIds, 0);
            expect(result).toEqual(new Set(['char-1', 'char-2']));
        });

        it('should expand to direct relations at hop depth 1', async () => {
            const mockCrudService = {
                getMany: jest.fn((relationName, where) => {
                    // CharacterDeity: char-1 -> deity-1
                    if (relationName === 'CharacterDeity' && where.character_id === 'char-1') {
                        return Promise.resolve([{ character_id: 'char-1', deity_id: 'deity-1' }]);
                    }
                    if (relationName === 'CharacterDeity' && where.deity_id === 'char-1') {
                        return Promise.resolve([]);
                    }
                    // For all other queries, return empty
                    return Promise.resolve([]);
                }),
            };
            const result = await getVisibleEntityIdsForUser(mockCrudService, ['char-1'], 1);
            expect(result).toContain('char-1');
            expect(result).toContain('deity-1');
        });

        it('should not expand beyond hop limit', async () => {
            const mockCrudService = {
                getMany: jest.fn((relationName, where) => {
                    // Simulate: char-1 -> deity-1 -> place-1
                    if (relationName === 'CharacterDeity' && where.character_id === 'char-1') {
                        return Promise.resolve([{ character_id: 'char-1', deity_id: 'deity-1' }]);
                    }
                    if (relationName === 'CharacterDeity' && where.deity_id === 'char-1') {
                        return Promise.resolve([]);
                    }
                    // deity-1 should not be expanded at all with maxHops=1, so no place-1
                    if (relationName === 'DeitySphere' && where.deity_id === 'deity-1') {
                        return Promise.resolve([{ deity_id: 'deity-1', sphere_id: 'sphere-1' }]);
                    }
                    return Promise.resolve([]);
                }),
            };
            const result = await getVisibleEntityIdsForUser(mockCrudService, ['char-1'], 1);
            // Should have char-1 and deity-1, but NOT sphere-1 (that would be 2 hops away)
            expect(result).toContain('char-1');
            expect(result).toContain('deity-1');
            expect(result).not.toContain('sphere-1');
        });

        it('should expand to 2 hops when maxHops=2', async () => {
            const mockCrudService = {
                getMany: jest.fn((relationName, where) => {
                    // char-1 -> deity-1
                    if (relationName === 'CharacterDeity' && where.character_id === 'char-1') {
                        return Promise.resolve([{ character_id: 'char-1', deity_id: 'deity-1' }]);
                    }
                    // deity-1 -> sphere-1
                    if (relationName === 'DeitySphere' && where.deity_id === 'deity-1') {
                        return Promise.resolve([{ deity_id: 'deity-1', sphere_id: 'sphere-1' }]);
                    }
                    // All other queries return empty
                    return Promise.resolve([]);
                }),
            };
            const result = await getVisibleEntityIdsForUser(mockCrudService, ['char-1'], 2);
            // Should have all three entities
            expect(result).toContain('char-1');
            expect(result).toContain('deity-1');
            expect(result).toContain('sphere-1');
        });

        it('should handle unlimited hops (maxHops=undefined)', async () => {
            const mockCrudService = {
                getMany: jest.fn((relationName, where) => {
                    // Simulate a chain: char-1 -> deity-1 -> sphere-1
                    if (relationName === 'CharacterDeity' && where.character_id === 'char-1') {
                        return Promise.resolve([{ character_id: 'char-1', deity_id: 'deity-1' }]);
                    }
                    if (relationName === 'DeitySphere' && where.deity_id === 'deity-1') {
                        return Promise.resolve([{ deity_id: 'deity-1', sphere_id: 'sphere-1' }]);
                    }
                    // Unlimited should also expand sphere-1 (even if no more relations)
                    if (relationName === 'CharacterDeity' && where.deity_id === 'char-1') {
                        return Promise.resolve([]);
                    }
                    if (relationName === 'DeitySphere' && where.sphere_id === 'deity-1') {
                        return Promise.resolve([]);
                    }
                    return Promise.resolve([]);
                }),
            };
            const result = await getVisibleEntityIdsForUser(mockCrudService, ['char-1'], undefined);
            // All entities should be visible with unlimited hops
            expect(result).toContain('char-1');
            expect(result).toContain('deity-1');
            expect(result).toContain('sphere-1');
        });

        it('should handle self-relations (Character <-> Character) within hop limit', async () => {
            const mockCrudService = {
                getMany: jest.fn((relationName, where) => {
                    // CharacterRelationship: char-1 related to char-2
                    if (relationName === 'CharacterRelationship' && where.character_id === 'char-1') {
                        return Promise.resolve([{ character_id: 'char-1', related_id: 'char-2' }]);
                    }
                    if (relationName === 'CharacterRelationship' && where.related_id === 'char-1') {
                        return Promise.resolve([]);
                    }
                    // char-2 related to char-3, but this is 2 hops, so should not expand at maxHops=1
                    if (relationName === 'CharacterRelationship' && where.character_id === 'char-2') {
                        return Promise.resolve([{ character_id: 'char-2', related_id: 'char-3' }]);
                    }
                    return Promise.resolve([]);
                }),
            };
            const result = await getVisibleEntityIdsForUser(mockCrudService, ['char-1'], 1);
            expect(result).toContain('char-1');
            expect(result).toContain('char-2');
            expect(result).not.toContain('char-3'); // 2 hops, beyond maxHops=1
        });

        it('should deduplicate entities seen via multiple paths', async () => {
            const mockCrudService = {
                getMany: jest.fn((relationName, where) => {
                    // Both char-1 and char-2 relate to deity-1
                    if (relationName === 'CharacterDeity' && where.character_id === 'char-1') {
                        return Promise.resolve([{ character_id: 'char-1', deity_id: 'deity-1' }]);
                    }
                    if (relationName === 'CharacterDeity' && where.character_id === 'char-2') {
                        return Promise.resolve([{ character_id: 'char-2', deity_id: 'deity-1' }]);
                    }
                    return Promise.resolve([]);
                }),
            };
            const result = await getVisibleEntityIdsForUser(mockCrudService, ['char-1', 'char-2'], 1);
            // deity-1 should appear only once in the Set
            expect(result.size).toBe(3); // char-1, char-2, deity-1
            expect(result).toContain('deity-1');
        });

        it('should handle empty anchored character list', async () => {
            const mockCrudService = {};
            const result = await getVisibleEntityIdsForUser(mockCrudService, [], 1);
            expect(result).toEqual(new Set());
        });

        it('should handle null anchored character list', async () => {
            const mockCrudService = {};
            const result = await getVisibleEntityIdsForUser(mockCrudService, null, 1);
            expect(result).toEqual(new Set());
        });

        it('should continue expanding from anchored characters even at hop 0 (they are the starting point)', async () => {
            // Hop 0 means we see the anchored character but don't expand from it to relations
            const mockCrudService = {
                getMany: jest.fn().mockResolvedValue([{ deity_id: 'deity-1' }]),
            };
            const result = await getVisibleEntityIdsForUser(mockCrudService, ['char-1'], 0);
            // With 0 hops, we should only see the anchored character, not deities
            expect(result).toEqual(new Set(['char-1']));
            // getMany should not have been called at all since we don't expand at hop 0
            expect(mockCrudService.getMany).not.toHaveBeenCalled();
        });
    });
});
