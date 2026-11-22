const {
    coerceValueByType,
    getEntityByRoute,
    getRelationMembers,
    getRelationByRoutes,
    conformObjectToEntity,
    validateDomainManifest,
} = require('../manifestHelpers');
const { domainManifest } = require('../../../common/domainManifest');
const { getEnumValues } = require('../../../common/enums');

describe('manifestHelpers isolated unit tests', () => {
    describe('coerceValueByType', () => {
        it('returns nullish values unchanged', () => {
            expect(coerceValueByType('string', undefined)).toBeUndefined();
            expect(coerceValueByType('string', null)).toBeNull();
        });

        it('coerces numbers, booleans, and strings', () => {
            expect(coerceValueByType('number', '42')).toBe(42);
            expect(coerceValueByType('boolean', 'true')).toBe(true);
            expect(coerceValueByType('boolean', 'FALSE')).toBe(false);
            expect(coerceValueByType('string', 123)).toBe('123');
        });

        it('rejects invalid numbers and booleans', () => {
            expect(() => coerceValueByType('number', 'not-a-number')).toThrow(
                'Invalid number value: not-a-number'
            );
            expect(() => coerceValueByType('boolean', 'maybe')).toThrow(
                'Invalid boolean value: maybe'
            );
        });

        it('accepts only values from an enum', () => {
            const alignments = ['lawful-good', 'true-neutral', 'chaotic-evil'];

            expect(coerceValueByType('string', 'lawful-good', alignments)).toBe('lawful-good');
            expect(() => coerceValueByType('string', 'unaligned', alignments)).toThrow(
                'Invalid value: expected one of lawful-good, true-neutral, chaotic-evil'
            );
        });

        it('resolves named enums from the shared registry', () => {
            const placeTypes = getEnumValues(domainManifest.entities.Place.fields.type.enum);

            expect(placeTypes).toEqual([
                'universe',
                'plane',
                'planet',
                'continent',
                'country',
                'region',
                'city-state',
                'city',
                'town',
                'site',
            ]);
            expect(
                conformObjectToEntity({ type: 'city-state' }, domainManifest.entities.Place)
            ).toEqual({ type: 'city-state' });
            expect(() => conformObjectToEntity({ type: 'village' }, domainManifest.entities.Place)).toThrow(
                'Invalid value: expected one of universe, plane, planet, continent, country, region, city-state, city, town, site'
            );
        });
    });

    describe('getEntityByRoute', () => {
        const manifest = {
            entities: {
                Character: { route: 'characters' },
                Item: { route: 'items' },
            },
        };

        it('returns the matching entity definition', () => {
            expect(getEntityByRoute('items', manifest)).toEqual({
                entityName: 'Item',
                entityDef: { route: 'items' },
            });
        });

        it('throws when the route is unknown', () => {
            expect(() => getEntityByRoute('missing', manifest)).toThrow(
                'Unknown entity route: missing'
            );
        });
    });

    describe('getRelationMembers', () => {
        it('returns explicit members when present', () => {
            const relationDef = {
                members: [
                    { entity: 'Character', key: 'character_id', route: 'items' },
                    { entity: 'Item', key: 'item_id', route: 'characters' },
                ],
            };

            expect(getRelationMembers(relationDef)).toBe(relationDef.members);
        });

        it('rejects legacy source/target metadata', () => {
            const relationDef = {
                source: 'Character',
                target: 'Item',
                sourceKey: 'character_id',
                targetKey: 'item_id',
                routeFromSource: 'items',
                routeFromTarget: 'characters',
            };

            expect(() => getRelationMembers(relationDef)).toThrow('Relation must define exactly two members');
        });

        it('throws when relation members are invalid', () => {
            expect(() => getRelationMembers({})).toThrow('Relation must define exactly two members');
        });
    });

    describe('getRelationByRoutes', () => {
        const manifest = {
            entities: {
                Character: { route: 'characters' },
                Item: { route: 'items' },
                Deity: { route: 'deities' },
            },
            relations: {
                CharacterItem: {
                    members: [
                        { entity: 'Character', key: 'character_id', route: 'items' },
                        { entity: 'Item', key: 'item_id', route: 'characters' },
                    ],
                },
            },
        };

        it('returns the matching relation and anchor information for explicit members', () => {
            expect(getRelationByRoutes('characters', 'items', manifest)).toEqual({
                relationName: 'CharacterItem',
                relationDef: manifest.relations.CharacterItem,
                anchorMemberIndex: 0,
                relatedMemberIndex: 1,
            });
        });

        it('throws when no relation matches the supplied routes', () => {
            expect(() => getRelationByRoutes('characters', 'missing', manifest)).toThrow(
                'Unknown related route for characters: missing'
            );
        });

        it('does not infer a reverse route from the target member', () => {
            expect(() => getRelationByRoutes('items', 'characters', manifest)).toThrow(
                'Unknown related route for items: characters'
            );
        });

        describe('validateDomainManifest', () => {
            const baseManifest = {
                entities: {
                    Character: { route: 'characters' },
                    Item: { route: 'items' },
                },
                relations: {
                    CharacterItem: {
                        members: [
                            { entity: 'Character', key: 'character_id', route: 'items' },
                            { entity: 'Item', key: 'item_id', route: 'characters' },
                        ],
                        keys: ['character_id', 'item_id'],
                    },
                },
            };

            it('accepts a valid directional relation', () => {
                expect(validateDomainManifest(baseManifest)).toBe(baseManifest);
            });

            it.each([
                ['unknown entity', { entity: 'Missing', key: 'item_id', route: 'characters' }, 'unknown entity'],
                ['missing route', { entity: 'Item', key: 'item_id' }, 'key and route'],
                ['unknown route', { entity: 'Item', key: 'item_id', route: 'missing' }, 'unknown route'],
            ])('rejects a relation with %s', (_label, targetMember, message) => {
                const manifest = {
                    ...baseManifest,
                    relations: {
                        CharacterItem: {
                            ...baseManifest.relations.CharacterItem,
                            members: [baseManifest.relations.CharacterItem.members[0], targetMember],
                        },
                    },
                };
                expect(() => validateDomainManifest(manifest)).toThrow(message);
            });

            it('rejects non-two-member relations and mismatched perspective names', () => {
                expect(() => validateDomainManifest({
                    ...baseManifest,
                    relations: { CharacterItem: { members: [], keys: [] } },
                })).toThrow('exactly two members');
                expect(() => validateDomainManifest({
                    ...baseManifest,
                    relations: {
                        ItemCharacter: baseManifest.relations.CharacterItem,
                    },
                })).toThrow('must begin with perspective entity');
            });
        });
    });

    describe('conformObjectToEntity', () => {
        const entityDef = {
            route: 'characters',
            fields: {
                id: { type: 'string', primary: true, format: 'slug' },
                level: { type: 'number' },
                active: { type: 'boolean' },
            },
        };

        it('coerces values for known fields', () => {
            expect(
                conformObjectToEntity(
                    {
                        id: 123,
                        level: '7',
                        active: 'true',
                    },
                    entityDef
                )
            ).toEqual({
                id: '123',
                level: 7,
                active: true,
            });
        });

        it('throws when object contains an unknown field', () => {
            expect(() =>
                conformObjectToEntity(
                    {
                        nickname: 'Ash',
                    },
                    entityDef
                )
            ).toThrow('Unknown field for route characters: nickname');
        });

        it('enforces slug format for primary id when enabled', () => {
            expect(() =>
                conformObjectToEntity(
                    {
                        id: 'Bad ID',
                    },
                    entityDef,
                    { enforcePrimaryIdFormat: true }
                )
            ).toThrow('Invalid slug id format for field id: Bad ID');

            expect(
                conformObjectToEntity(
                    {
                        id: 'good-id',
                    },
                    entityDef,
                    { enforcePrimaryIdFormat: true }
                )
            ).toEqual({ id: 'good-id' });
        });

        it('does not enforce slug format when disabled', () => {
            expect(
                conformObjectToEntity(
                    {
                        id: 'Bad ID',
                    },
                    entityDef
                )
            ).toEqual({ id: 'Bad ID' });
        });
    });
});
