const { buildMentionTargets } = require('../mentionsRouter');

describe('mentionsRouter', () => {
    it('combines canonical names and aliases into routed mention targets', () => {
        const targets = buildMentionTargets(
            {
                Character: [
                    { id: 'alann-barnett', name: 'Alann Barnett' },
                    { id: 'unnamed', name: '' },
                ],
                Place: [{ id: 'wavethorn', name: 'Wavethorn' }],
                Alias: [{ id: 1, name: 'Alann' }],
            },
            [
                { entity_type: 'character', entity_id: 'alann-barnett', alias: 'Alann' },
                { entity_type: 'PLACE', entity_id: 'wavethorn', alias: 'City of Wavethorn' },
                { entity_type: 'character', entity_id: 'missing', alias: 'Orphan' },
            ]
        );

        expect(targets).toEqual([
            {
                route: 'characters',
                id: 'alann-barnett',
                name: 'Alann Barnett',
                aliases: ['Alann'],
            },
            {
                route: 'places',
                id: 'wavethorn',
                name: 'Wavethorn',
                aliases: ['City of Wavethorn'],
            },
        ]);
    });
});
