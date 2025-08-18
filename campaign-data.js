if (typeof window === 'undefined') {
    global.window = {};
}
//Create global data structure containing playerCharacters, nonPlayerCharacters, places, items, sessions, organizations, and deities
window.CAMPAIGN = {
    playerCharacters: [],
    nonPlayerCharacters: [],
    deities: [],
    organizations: [],
    places: [],
    items: [],
    sessions: []
};
window.CAMPAIGN.playerCharacters = [
    {
        id: "alann-barnett",
        name: "Alann Barnett",
        aliases: [
            "Alann"
        ],
        statblock: {
            strength: 13,
            dexterity: 8,
            constitution: 11,
            intelligence: 10,
            wisdom: 14,
            charisma: 11
        },
        href: "/campaign-notes/characters/player-characters/alann-barnett.html"
    },
    {
        id: "releas-neb",
        name: "Releas Neb",
        aliases: [
            "Rel",
            "Releas Scarnewman",
            "Releas"
        ],
        statblock: {
            strength: 5,
            dexterity: 14,
            constitution: 10,
            intelligence: 18,
            wisdom: 13,
            charisma: 9
        },
        href: "/campaign-notes/characters/player-characters/releas-neb.html"
    },
    {
        id: "appolonia-palleday",
        name: "Appolonia Palleday",
        aliases: [
            "Appolonia",
            "Polly"
        ],
        statblock: {
            strength: 13,
            dexterity: 8,
            constitution: 11,
            intelligence: 18,
            wisdom: 14,
            charisma: 11
        },
        href: "/campaign-notes/characters/player-characters/appolonia-palleday.html"
    },
    {
        id: "durchir",
        name: "Durchir of the Angry Orchard",
        aliases: [
            "Durchir"
        ],
        statblock: {
            strength: 18,
            dexterity: 10,
            constitution: 12,
            intelligence: 15,
            wisdom: 10,
            charisma: 11
        },
        href: "/campaign-notes/characters/player-characters/durchir.html"
    },
    {
        id: "cormac",
        name: "Cormac",
        aliases: [],
        statblock: {
            strength: 9,
            dexterity: 16,
            constitution: 7,
            intelligence: 15,
            wisdom: 14,
            charisma: 7
        },
        href: "/campaign-notes/characters/player-characters/cormac.html"
    }
];
window.CAMPAIGN.nonPlayerCharacters = [
    {
        id: "bert-verinwort",
        name: "Bert Verinwort",
        aliases: [
            "Bert"
        ],
        href: "/campaign-notes/places/othlorin/wavethorn-area/wavethorn.html#bert-verinwort"
    },
    {
        id: "gereg",
        name: "Gereg",
        aliases: [],
        href: "/campaign-notes/places/othlorin/wavethorn-area/wavethorn.html#gereg"
    },
    {
        id: "leo",
        name: "Leo",
        aliases: [],
        href: "/campaign-notes/places/othlorin/wavethorn-area/wavethorn.html#leo"
    }
];
window.CAMPAIGN.deities = [
    {
        id: "achiel",
        name: "Achiel",
        aliases: [
            "Achiel, God of Light",
            "Achiel God of Light"
        ],
        href: "/campaign-notes/characters/deities/achiel.html"
    },
    {
        id: "idona",
        name: "Idona",
        aliases: [
            "Idona, Goddess of Humanity",
            "Idona, Goddess of the Moon",
            "Idona, Mother to Humankind"
        ],
        href: "/campaign-notes/characters/deities/idona.html"
    },
    {
        id: "ponat",
        name: "Ponat",
        aliases: [
            "Ponat, God of Fortress",
            "Ponat, God of the Fortress"
        ],
        href: "/campaign-notes/characters/deities/ponat.html"
    }
];
window.CAMPAIGN.organizations = [
    {
        id: "church-of-achiels-light",
        name: "Church of Achiel's Light",
        aliases: [
            "Church of Achiel",
            "High Church"
        ],
        href: "/campaign-notes/organizations/church-of-achiels-light.html"
    }
];
window.CAMPAIGN.places = [
    {
        id: "anash",
        name: "Anash",
        aliases: [],
        href: "/campaign-notes/places/othlorin/itholis/weinmere/anash.html"
    },
    {
        id: "wavethorn",
        name: "Wavethorn",
        aliases: [
            "City of Wavethorn",
            "Wavethorn (City)"
        ],
        href: "/campaign-notes/places/othlorin/wavethorn-area/wavethorn.html"
    },
    {
        id: "gharmil",
        name: "Gharmil",
        aliases: [
            "Niba (City)",
            "Niba",
            "Eye of the World"
        ],
        href: "/campaign-notes/places/othlorin/niba/gharmil.html"
    }
];
window.CAMPAIGN.items = [
    {
        id: "cormac-spellbook",
        name: "Cormac's Spellbook",
        aliases: [],
        href: "/campaign-notes/items/tomes/cormac-spellbook.html"
    },
    {
        id: "polly-spellbook",
        name: "Polly's Spellbook",
        aliases: [],
        href: "/campaign-notes/items/tomes/polly-spellbook.html"
    }
];
window.CAMPAIGN.sessions = [
    {
        id: "coup-of-wavethorn",
        name: "The Coup of Wavethorn",
        aliases: [
            "Coup of Wavethorn",
            "Coup of 200",
            "Wavethorn Coup",
            "OOTID Sessions 1 and 2"
        ],
        href: "/campaign-notes/sessions/order-of-the-iron-duch/coup-of-wavethorn.html"
    }
];

// For Node.js compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = window.CAMPAIGN;
}