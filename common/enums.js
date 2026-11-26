const ENUMS = {
    placeType: [
        'universe',
        'plane',
        'planet',
        'continent',
        'country',
        'region',
        'city-state',
        'city',
        'town',
        'establishment',
        'site'
    ],
    organizationType: [
        'adventuring-party',
        'government',
        'guild',
        'religious',
        'pantheon',
        'informal',
        'enterprise',
        'gang',
        'family',
        'association',
        'order'
    ],
    ancestry: [
        'human',
        'high-elf',
        'wood-elf',
        'dark-elf',
        'half-elf',
        'dwarf'
    ],
    alignment: [
        'lawful-good',
        'neutral-good',
        'chaotic-good',
        'lawful-neutral',
        'true-neutral',
        'chaotic-neutral',
        'lawful-evil',
        'neutral-evil',
        'chaotic-evil',
    ],
    characterRelationship: [
        'friend',
        'rival',
        'enemy',
        'associate',
        'mentor',
        'student',
        'lover',
        'spouse',
        'family'
    ]
};

function getEnumValues(enumDefinition) {
    if (Array.isArray(enumDefinition)) return enumDefinition;
    if (typeof enumDefinition !== 'string') return undefined;

    const values = ENUMS[enumDefinition];
    if (!values) {
        throw new Error(`Unknown enum: ${enumDefinition}`);
    }

    return values;
}

module.exports = { ENUMS, getEnumValues };
