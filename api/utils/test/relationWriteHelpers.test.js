jest.mock('../../../common/domainManifest', () => ({
    domainManifest: {
        entities: {
            Character: { idField: 'id', fields: { id: { type: 'string' } } },
            Item: { idField: 'id', fields: { id: { type: 'string' } } },
        },
    },
}));

jest.mock('../manifestHelpers', () => ({
    coerceValueByType: jest.fn((type, value) => {
        if (type === 'number') {
            const n = Number(value);
            if (Number.isNaN(n)) {
                throw new Error(`Invalid number value: ${value}`);
            }
            return n;
        }

        if (type === 'boolean') {
            if (value === true || value === false) return value;
            if (typeof value === 'string') {
                const normalized = value.trim().toLowerCase();
                if (normalized === 'true') return true;
                if (normalized === 'false') return false;
            }
            throw new Error(`Invalid boolean value: ${value}`);
        }

        if (type === 'string') return String(value);
        return value;
    }),
    getRelationMembers: jest.fn((relationDef) => relationDef.members),
}));

const manifestHelpers = require('../manifestHelpers');
const {
    getRelatedMemberInfo,
    normalizeRelationPayload,
    normalizeRelationUpdatePayload,
    getValidatedHistorySelector,
    buildRelationInsertData,
    buildRelationWhere,
} = require('../relationWriteHelpers');

describe('relationWriteHelpers isolated unit tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getRelatedMemberInfo', () => {
        it('returns members and the opposite member/entity definition', () => {
            const relationDef = {
                members: [
                    { entity: 'Character', key: 'character_id' },
                    { entity: 'Item', key: 'item_id' },
                ],
            };

            const result = getRelatedMemberInfo(relationDef, 0);

            expect(manifestHelpers.getRelationMembers).toHaveBeenCalledWith(relationDef);
            expect(result).toEqual({
                members: relationDef.members,
                relatedMember: { entity: 'Item', key: 'item_id' },
                relatedEntityDef: { idField: 'id', fields: { id: { type: 'string' } } },
            });
        });

        it('uses the opposite member when the anchor index is reversed', () => {
            const relationDef = {
                members: [
                    { entity: 'Character', key: 'character_id' },
                    { entity: 'Item', key: 'item_id' },
                ],
            };

            const result = getRelatedMemberInfo(relationDef, 1);

            expect(result).toEqual({
                members: relationDef.members,
                relatedMember: { entity: 'Character', key: 'character_id' },
                relatedEntityDef: { idField: 'id', fields: { id: { type: 'string' } } },
            });
        });

        it('throws when related member entity is not in domain manifest', () => {
            const relationDef = {
                members: [
                    { entity: 'Character', key: 'character_id' },
                    { entity: 'UnknownEntity', key: 'unknown_id' },
                ],
            };

            expect(() => getRelatedMemberInfo(relationDef, 0)).toThrow(
                'Unknown related entity: UnknownEntity'
            );
        });
    });

    describe('normalizeRelationPayload', () => {
        it('returns empty object when payload is undefined or null', () => {
            const relationDef = { payload: { notes: { type: 'string' } } };

            expect(normalizeRelationPayload(undefined, relationDef)).toEqual({});
            expect(normalizeRelationPayload(null, relationDef)).toEqual({});
        });

        it('throws when payload is not an object', () => {
            expect(() => normalizeRelationPayload('bad', { payload: {} })).toThrow(
                'Data must be an object'
            );
            expect(() => normalizeRelationPayload([], { payload: {} })).toThrow(
                'Data must be an object'
            );
        });

        it('throws when payload includes unknown field', () => {
            const relationDef = {
                payload: {
                    short_description: { type: 'string' },
                },
            };

            expect(() =>
                normalizeRelationPayload({ unknown_field: 'x' }, relationDef)
            ).toThrow('Unknown field for relation: unknown_field');
        });

        it('normalizes payload values using field types', () => {
            const relationDef = {
                payload: {
                    score: { type: 'number' },
                    public: { type: 'boolean' },
                    short_description: { type: 'string' },
                },
            };

            const result = normalizeRelationPayload(
                {
                    score: '42',
                    public: 'true',
                    short_description: 123,
                },
                relationDef
            );

            expect(result).toEqual({
                score: 42,
                public: true,
                short_description: '123',
            });
        });
    });

    describe('normalizeRelationUpdatePayload', () => {
        it('returns empty object when payload is undefined or null', () => {
            const relationDef = { payload: { notes: { type: 'string' } } };

            expect(normalizeRelationUpdatePayload(undefined, relationDef)).toEqual({});
            expect(normalizeRelationUpdatePayload(null, relationDef)).toEqual({});
        });

        it('throws when payload is not an object', () => {
            expect(() => normalizeRelationUpdatePayload('bad', { payload: {} })).toThrow(
                'Data must be an object'
            );
            expect(() => normalizeRelationUpdatePayload([], { payload: {} })).toThrow(
                'Data must be an object'
            );
        });

        it('throws for unknown fields', () => {
            const relationDef = {
                kind: 'relationship',
                payload: {
                    short_description: { type: 'string' },
                },
            };

            expect(() =>
                normalizeRelationUpdatePayload({ unknown_field: 'x' }, relationDef)
            ).toThrow('Unknown field for relation: unknown_field');
        });

        it('forbids updates to history key for history relations', () => {
            const relationDef = {
                kind: 'history',
                historyKey: 'acquired_date',
                payload: {
                    acquired_date: { type: 'string' },
                    short_description: { type: 'string' },
                },
            };

            expect(() =>
                normalizeRelationUpdatePayload(
                    {
                        acquired_date: '100-01-01',
                    },
                    relationDef
                )
            ).toThrow('Cannot update primary key field: acquired_date');
        });

        it('allows non-history relations to update any declared payload field', () => {
            const relationDef = {
                kind: 'relationship',
                historyKey: 'acquired_date',
                payload: {
                    acquired_date: { type: 'string' },
                },
            };

            const result = normalizeRelationUpdatePayload(
                {
                    acquired_date: 123,
                },
                relationDef
            );

            expect(result).toEqual({ acquired_date: '123' });
        });
    });

    describe('getValidatedHistorySelector', () => {
        it('returns undefined for non-history relations', () => {
            const relationDef = {
                kind: 'relationship',
                historyKey: 'acquired_date',
                payload: { acquired_date: { type: 'string' } },
            };

            expect(getValidatedHistorySelector({ acquired_date: 'x' }, relationDef)).toBeUndefined();
        });

        it('throws on unknown query fields', () => {
            const relationDef = {
                kind: 'history',
                historyKey: 'acquired_date',
                payload: { acquired_date: { type: 'string' } },
            };

            expect(() =>
                getValidatedHistorySelector({ wrong: 'x' }, relationDef)
            ).toThrow('Unknown query field for relation: wrong');
        });

        it('throws when required selector is missing', () => {
            const relationDef = {
                kind: 'history',
                historyKey: 'acquired_date',
                payload: { acquired_date: { type: 'string' } },
            };

            expect(() =>
                getValidatedHistorySelector({}, relationDef, { required: true })
            ).toThrow('Missing required query field: acquired_date');
        });

        it('returns undefined when selector is missing and not required', () => {
            const relationDef = {
                kind: 'history',
                historyKey: 'acquired_date',
                payload: { acquired_date: { type: 'string' } },
            };

            expect(getValidatedHistorySelector({}, relationDef, { required: false })).toBeUndefined();
        });

        it('coerces selector to payload type when provided', () => {
            const relationDef = {
                kind: 'history',
                historyKey: 'position',
                payload: { position: { type: 'number' } },
            };

            const value = getValidatedHistorySelector({ position: '2' }, relationDef);

            expect(manifestHelpers.coerceValueByType).toHaveBeenCalledWith('number', '2');
            expect(value).toBe(2);
        });

        it('defaults selector type to string when payload metadata is missing', () => {
            const relationDef = {
                kind: 'history',
                historyKey: 'acquired_date',
                payload: {},
            };

            const value = getValidatedHistorySelector({ acquired_date: 10101 }, relationDef);

            expect(manifestHelpers.coerceValueByType).toHaveBeenCalledWith('string', 10101);
            expect(value).toBe('10101');
        });
    });

    describe('buildRelationInsertData', () => {
        it('maps source and related ids based on anchor member index', () => {
            const members = [
                { entity: 'Character', key: 'character_id' },
                { entity: 'Item', key: 'item_id' },
            ];

            const result = buildRelationInsertData({
                relationDef: { kind: 'relationship' },
                members,
                anchorMemberIndex: 1,
                sourceId: 'item-1',
                relatedId: 'char-1',
                payload: { short_description: 'linked' },
            });

            expect(result).toEqual({
                item_id: 'item-1',
                character_id: 'char-1',
                short_description: 'linked',
            });
        });

        it('preserves member ordering when the anchor index is the first member', () => {
            const members = [
                { entity: 'Character', key: 'character_id' },
                { entity: 'Item', key: 'item_id' },
            ];

            const result = buildRelationInsertData({
                relationDef: { kind: 'relationship' },
                members,
                anchorMemberIndex: 0,
                sourceId: 'char-1',
                relatedId: 'item-1',
                payload: {},
            });

            expect(result).toEqual({
                character_id: 'char-1',
                item_id: 'item-1',
            });
        });
    });

    describe('buildRelationWhere', () => {
        it('builds where for source and related ids', () => {
            const members = [
                { entity: 'Character', key: 'character_id' },
                { entity: 'Item', key: 'item_id' },
            ];

            const where = buildRelationWhere({
                members,
                anchorMemberIndex: 0,
                sourceId: 'char-1',
                relatedId: 'item-1',
                relationDef: { kind: 'relationship' },
            });

            expect(where).toEqual({
                character_id: 'char-1',
                item_id: 'item-1',
            });
        });

        it('includes history key only when relation is history and historyValue is provided', () => {
            const members = [
                { entity: 'Character', key: 'character_id' },
                { entity: 'Item', key: 'item_id' },
            ];

            const withHistory = buildRelationWhere({
                members,
                anchorMemberIndex: 0,
                sourceId: 'char-1',
                relatedId: 'item-1',
                relationDef: { kind: 'history', historyKey: 'acquired_date' },
                historyValue: '100-01-01',
            });

            const withoutHistoryValue = buildRelationWhere({
                members,
                anchorMemberIndex: 0,
                sourceId: 'char-1',
                relatedId: 'item-1',
                relationDef: { kind: 'history', historyKey: 'acquired_date' },
                historyValue: undefined,
            });

            const nonHistory = buildRelationWhere({
                members,
                anchorMemberIndex: 0,
                sourceId: 'char-1',
                relatedId: 'item-1',
                relationDef: { kind: 'relationship', historyKey: 'acquired_date' },
                historyValue: '100-01-01',
            });

            expect(withHistory).toEqual({
                character_id: 'char-1',
                item_id: 'item-1',
                acquired_date: '100-01-01',
            });
            expect(withoutHistoryValue).toEqual({
                character_id: 'char-1',
                item_id: 'item-1',
            });
            expect(nonHistory).toEqual({
                character_id: 'char-1',
                item_id: 'item-1',
            });
        });

        it('builds reversed where clauses when the anchor index changes', () => {
            const members = [
                { entity: 'Character', key: 'character_id' },
                { entity: 'Item', key: 'item_id' },
            ];

            const where = buildRelationWhere({
                members,
                anchorMemberIndex: 1,
                sourceId: 'item-1',
                relatedId: 'char-1',
                relationDef: { kind: 'relationship' },
            });

            expect(where).toEqual({
                item_id: 'item-1',
                character_id: 'char-1',
            });
        });
    });
});
