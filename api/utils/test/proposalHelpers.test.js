const {
    stableStringify,
    buildEntityTargetKey,
    filterProposableChanges,
    diffAgainstCurrent,
    mergeProposedView,
} = require('../proposalHelpers');

describe('proposalHelpers', () => {
    describe('stableStringify', () => {
        it('produces identical output regardless of key insertion order', () => {
            const a = { character_id: 'c1', deity_id: 'd1' };
            const b = { deity_id: 'd1', character_id: 'c1' };

            expect(stableStringify(a)).toBe(stableStringify(b));
        });

        it('treats an undefined/null object as empty', () => {
            expect(stableStringify(undefined)).toBe('{}');
            expect(stableStringify(null)).toBe('{}');
        });
    });

    describe('buildEntityTargetKey', () => {
        it('builds a single-field where-clause keyed by idField', () => {
            expect(buildEntityTargetKey('id', 'char-1')).toEqual({ id: 'char-1' });
        });
    });

    describe('filterProposableChanges', () => {
        const fieldDefs = {
            id: { type: 'string', primary: true },
            is_public: { type: 'boolean', access: { playerProposable: false } },
            short_description: { type: 'string' },
        };

        it('coerces and passes through proposable fields', () => {
            expect(filterProposableChanges({ short_description: 'Updated' }, fieldDefs)).toEqual({
                short_description: 'Updated',
            });
        });

        it('rejects unknown fields', () => {
            expect(() => filterProposableChanges({ nickname: 'Ash' }, fieldDefs)).toThrow(
                'Unknown field for proposal: nickname'
            );
        });

        it('rejects primary key fields', () => {
            expect(() => filterProposableChanges({ id: 'char-2' }, fieldDefs)).toThrow(
                'Cannot propose changes to primary key field: id'
            );
        });

        it('rejects fields opted out via access.playerProposable', () => {
            expect(() => filterProposableChanges({ is_public: true }, fieldDefs)).toThrow(
                'Field is not player-proposable: is_public'
            );
        });

        it('returns an empty object for nullish input', () => {
            expect(filterProposableChanges(undefined, fieldDefs)).toEqual({});
            expect(filterProposableChanges(null, fieldDefs)).toEqual({});
        });

        it('rejects non-object input', () => {
            expect(() => filterProposableChanges('nope', fieldDefs)).toThrow('Data must be an object');
        });
    });

    describe('diffAgainstCurrent', () => {
        it('keeps only fields that differ from the current record', () => {
            const diff = diffAgainstCurrent(
                { short_description: 'Same', long_explanation: 'New text' },
                { short_description: 'Same', long_explanation: 'Old text' }
            );

            expect(diff).toEqual({ long_explanation: 'New text' });
        });

        it('returns an empty object when nothing changed', () => {
            const diff = diffAgainstCurrent({ short_description: 'Same' }, { short_description: 'Same' });
            expect(diff).toEqual({});
        });
    });

    describe('mergeProposedView', () => {
        it('overlays proposed changes on top of the base record', () => {
            const merged = mergeProposedView(
                { id: 'char-1', short_description: 'Old' },
                { short_description: 'New' }
            );

            expect(merged).toEqual({ id: 'char-1', short_description: 'New' });
        });
    });
});
