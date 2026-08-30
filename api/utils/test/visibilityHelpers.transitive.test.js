/**
 * Tests for transitive visibility graph traversal
 *
 * These tests validate that getVisibleEntityIdsForUser correctly traverses
 * the full entity relationship graph from anchored characters.
 */

// Mock domainManifest before importing getVisibleEntityIdsForUser
const mockDomainManifest = {
    entities: {
        Character: { route: 'characters' },
        Place: { route: 'places' },
        Organization: { route: 'organizations' },
        Deity: { route: 'deities' },
        Item: { route: 'items' },
    },
    relations: {
        CharacterPlace: {
            members: [
                { entity: 'Character', key: 'character_id' },
                { entity: 'Place', key: 'place_id' },
            ],
        },
        CharacterOrganization: {
            members: [
                { entity: 'Character', key: 'character_id' },
                { entity: 'Organization', key: 'organization_id' },
            ],
        },
        PlaceOrganization: {
            members: [
                { entity: 'Place', key: 'place_id' },
                { entity: 'Organization', key: 'organization_id' },
            ],
        },
        CharacterDeity: {
            members: [
                { entity: 'Character', key: 'character_id' },
                { entity: 'Deity', key: 'deity_id' },
            ],
        },
        OrganizationItem: {
            members: [
                { entity: 'Organization', key: 'organization_id' },
                { entity: 'Item', key: 'item_id' },
            ],
        },
        CharacterRelationship: {
            members: [
                { entity: 'Character', key: 'character_a_id' },
                { entity: 'Character', key: 'character_b_id' },
            ],
        },
    },
};

jest.mock('../../../common/domainManifest', () => ({
    domainManifest: mockDomainManifest,
}));

const { getVisibleEntityIdsForUser } = require('../visibilityHelpers');

/**
 * Mock CRUD service for testing
 * Stores relations in memory and allows querying by any member key
 */
class MockCrudService {
    constructor() {
        this.relations = {};
    }

    /**
     * Add a relation record
     * relationName: string like 'CharacterDeity'
     * record: object with keys like { character_id, deity_id, startDate, endDate }
     */
    addRelation(relationName, record) {
        if (!this.relations[relationName]) {
            this.relations[relationName] = [];
        }
        this.relations[relationName].push(record);
    }

    /**
     * Mock getMany: find records matching query
     */
    async getMany(relationName, query) {
        if (!this.relations[relationName]) {
            return [];
        }

        const results = [];
        for (const record of this.relations[relationName]) {
            let matches = true;
            for (const [key, value] of Object.entries(query)) {
                if (record[key] !== value) {
                    matches = false;
                    break;
                }
            }
            if (matches) {
                results.push(record);
            }
        }
        return results;
    }

    /**
     * Mock getOne: find single record matching query
     */
    async getOne(relationName, query) {
        const results = await this.getMany(relationName, query);
        return results.length > 0 ? results[0] : null;
    }
}

describe('getVisibleEntityIdsForUser - Graph Traversal Visibility', () => {
    let mockCrudService;

    beforeEach(() => {
        mockCrudService = new MockCrudService();
    });

    test('should return anchored characters when no relations exist', async () => {
        const anchoredIds = ['char-1'];
        const visible = await getVisibleEntityIdsForUser(mockCrudService, anchoredIds);

        expect(visible.has('char-1')).toBe(true);
        expect(visible.size).toBe(1);
    });

    test('should return empty set for null anchored characters', async () => {
        const visible = await getVisibleEntityIdsForUser(mockCrudService, null);
        expect(visible.size).toBe(0);
    });

    test('should return empty set for empty anchored characters array', async () => {
        const visible = await getVisibleEntityIdsForUser(mockCrudService, []);
        expect(visible.size).toBe(0);
    });

    test('should find single-level relations (direct relations from character)', async () => {
        mockCrudService.addRelation('CharacterPlace', {
            character_id: 'char-1',
            place_id: 'place-1',
            startDate: '1000-01-01',
            endDate: '1100-01-01',
        });

        const visible = await getVisibleEntityIdsForUser(mockCrudService, ['char-1']);

        expect(visible.has('char-1')).toBe(true);
        expect(visible.has('place-1')).toBe(true);
        expect(visible.size).toBe(2);
    });

    test('should find multi-level relations (transitive chains)', async () => {
        // Character -> Place -> Organization
        mockCrudService.addRelation('CharacterPlace', {
            character_id: 'char-1',
            place_id: 'place-1',
        });
        mockCrudService.addRelation('PlaceOrganization', {
            place_id: 'place-1',
            organization_id: 'org-1',
        });

        const visible = await getVisibleEntityIdsForUser(mockCrudService, ['char-1']);

        expect(visible.has('char-1')).toBe(true);
        expect(visible.has('place-1')).toBe(true);
        expect(visible.has('org-1')).toBe(true);
        expect(visible.size).toBe(3);
    });

    test('should traverse deep chains (char -> place -> org -> item)', async () => {
        mockCrudService.addRelation('CharacterPlace', {
            character_id: 'char-1',
            place_id: 'place-1',
        });
        mockCrudService.addRelation('PlaceOrganization', {
            place_id: 'place-1',
            organization_id: 'org-1',
        });
        mockCrudService.addRelation('OrganizationItem', {
            organization_id: 'org-1',
            item_id: 'item-1',
        });

        const visible = await getVisibleEntityIdsForUser(mockCrudService, ['char-1']);

        expect(visible.has('char-1')).toBe(true);
        expect(visible.has('place-1')).toBe(true);
        expect(visible.has('org-1')).toBe(true);
        expect(visible.has('item-1')).toBe(true);
        expect(visible.size).toBe(4);
    });

    test('should handle self-relations (character to character)', async () => {
        // Character A knows Character B
        mockCrudService.addRelation('CharacterRelationship', {
            character_a_id: 'char-1',
            character_b_id: 'char-2',
        });

        const visible = await getVisibleEntityIdsForUser(mockCrudService, ['char-1']);

        expect(visible.has('char-1')).toBe(true);
        expect(visible.has('char-2')).toBe(true);
        expect(visible.size).toBe(2);
    });

    test('should handle self-relations in reverse direction', async () => {
        // Character B knows Character A (testing reverse direction query)
        mockCrudService.addRelation('CharacterRelationship', {
            character_a_id: 'char-2',
            character_b_id: 'char-1',
        });

        const visible = await getVisibleEntityIdsForUser(mockCrudService, ['char-1']);

        expect(visible.has('char-1')).toBe(true);
        expect(visible.has('char-2')).toBe(true);
        expect(visible.size).toBe(2);
    });

    test('should not infinite loop on circular references', async () => {
        // Character A -> Organization -> Character A (circular)
        mockCrudService.addRelation('CharacterOrganization', {
            character_id: 'char-1',
            organization_id: 'org-1',
        });
        // Simulate circular: Organization -> Place -> Character
        mockCrudService.addRelation('PlaceOrganization', {
            place_id: 'place-1',
            organization_id: 'org-1',
        });
        mockCrudService.addRelation('CharacterPlace', {
            character_id: 'char-1',
            place_id: 'place-1',
        });

        // This should not infinite loop
        const visible = await getVisibleEntityIdsForUser(mockCrudService, ['char-1']);

        expect(visible.has('char-1')).toBe(true);
        expect(visible.has('org-1')).toBe(true);
        expect(visible.has('place-1')).toBe(true);
        // Should not grow unboundedly
        expect(visible.size).toBe(3);
    });

    test('should handle multiple anchored characters', async () => {
        // Character 1 -> Place 1
        mockCrudService.addRelation('CharacterPlace', {
            character_id: 'char-1',
            place_id: 'place-1',
        });
        // Character 2 -> Place 2
        mockCrudService.addRelation('CharacterPlace', {
            character_id: 'char-2',
            place_id: 'place-2',
        });

        const visible = await getVisibleEntityIdsForUser(mockCrudService, ['char-1', 'char-2']);

        expect(visible.has('char-1')).toBe(true);
        expect(visible.has('char-2')).toBe(true);
        expect(visible.has('place-1')).toBe(true);
        expect(visible.has('place-2')).toBe(true);
        expect(visible.size).toBe(4);
    });

    test('should handle multiple relations from same entity', async () => {
        // Character -> Place 1 AND Character -> Place 2
        mockCrudService.addRelation('CharacterPlace', {
            character_id: 'char-1',
            place_id: 'place-1',
        });
        mockCrudService.addRelation('CharacterPlace', {
            character_id: 'char-1',
            place_id: 'place-2',
        });
        // Character -> Organization
        mockCrudService.addRelation('CharacterOrganization', {
            character_id: 'char-1',
            organization_id: 'org-1',
        });

        const visible = await getVisibleEntityIdsForUser(mockCrudService, ['char-1']);

        expect(visible.has('char-1')).toBe(true);
        expect(visible.has('place-1')).toBe(true);
        expect(visible.has('place-2')).toBe(true);
        expect(visible.has('org-1')).toBe(true);
        expect(visible.size).toBe(4);
    });

    test('should handle complex branching graphs', async () => {
        // Character knows Organization and Place
        mockCrudService.addRelation('CharacterOrganization', {
            character_id: 'char-1',
            organization_id: 'org-1',
        });
        mockCrudService.addRelation('CharacterPlace', {
            character_id: 'char-1',
            place_id: 'place-1',
        });
        // Organization has Item, Place has Organization
        mockCrudService.addRelation('OrganizationItem', {
            organization_id: 'org-1',
            item_id: 'item-1',
        });
        mockCrudService.addRelation('PlaceOrganization', {
            place_id: 'place-1',
            organization_id: 'org-2',
        });
        // Organization 2 has Item 2
        mockCrudService.addRelation('OrganizationItem', {
            organization_id: 'org-2',
            item_id: 'item-2',
        });

        const visible = await getVisibleEntityIdsForUser(mockCrudService, ['char-1']);

        expect(visible.has('char-1')).toBe(true);
        expect(visible.has('org-1')).toBe(true);
        expect(visible.has('place-1')).toBe(true);
        expect(visible.has('item-1')).toBe(true);
        expect(visible.has('org-2')).toBe(true);
        expect(visible.has('item-2')).toBe(true);
        expect(visible.size).toBe(6);
    });

    test('should handle relation query failures gracefully', async () => {
        const failingService = {
            async getMany() {
                throw new Error('Database error');
            },
            async getOne() {
                throw new Error('Database error');
            },
        };

        // Should not throw, just return anchored characters
        const visible = await getVisibleEntityIdsForUser(failingService, ['char-1']);
        expect(visible.has('char-1')).toBe(true);
    });

    test('should deduplicate entities when reachable via multiple paths', async () => {
        // Character -> Organization (direct)
        mockCrudService.addRelation('CharacterOrganization', {
            character_id: 'char-1',
            organization_id: 'org-1',
        });
        // Character -> Place -> Organization (transitive)
        mockCrudService.addRelation('CharacterPlace', {
            character_id: 'char-1',
            place_id: 'place-1',
        });
        mockCrudService.addRelation('PlaceOrganization', {
            place_id: 'place-1',
            organization_id: 'org-1',
        });

        const visible = await getVisibleEntityIdsForUser(mockCrudService, ['char-1']);

        // Should have char-1, place-1, org-1 (not duplicated)
        expect(visible.has('char-1')).toBe(true);
        expect(visible.has('place-1')).toBe(true);
        expect(visible.has('org-1')).toBe(true);
        expect(visible.size).toBe(3);
    });
});
