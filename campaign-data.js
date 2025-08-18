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
CAMPAIGN.playerCharacters = [
    {
        id: "alann-barnett",
        name: "Alann Barnett",
        aliases: [
            "Alann Barnett",
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
            "Releas Neb",
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
        href: "/characters/player-characters/releas-neb.html"
    },
    {
        id: "appolonia-palleday",
        name: "Appolonia Palleday",
        aliases: [
            "Appolonia Palleday",
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
            "Durchir of the Angry Orchard",
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
        href: "/characters/player-characters/durchir.html"
    },
    {
        id: "cormac",
        name: "Cormac",
        aliases: [
            "Cormac"
        ],
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
CAMPAIGN.nonPlayerCharacters = [
    {
        id: "bert-verinwort",
        name: "Bert Verinwort",
        aliases: [
            "Bert Verinwort",
            "Bert"
        ],
        href: "/campaign-notes/characters/non-player-characters/bert-verinwort.html"
    },
    {
        id: "gereg",
        name: "Gereg",
        aliases: [
            "Gereg"
        ],
        href: "/campaign-notes/characters/non-player-characters/gereg.html"
    },
    {
        id: "leo",
        name: "Leo",
        aliases: [
            "Leo"
        ],
        href: "/campaign-notes/characters/non-player-characters/leo.html"
    }
];
CAMPAIGN.deities = [
    {
        id: "achiel",
        name: "Achiel",
        aliases: [
            "Achiel",
            "Achiel, God of Light",
            "Achiel God of Light"
        ],
        href: "/campaign-notes/characters/deities/achiel.html"
    },
    {
        id: "idona",
        name: "Idona",
        aliases: [
            "Idona",
            "Idona, Goddess of Humanity",
            "Idona, Goddess of the Moon"
        ],
        href: "/campaign-notes/characters/deities/idona.html"
    }
];
CAMPAIGN.organizations = [
    {
        id: "church-of-achiels-light",
        name: "Church of Achiel's Light",
        aliases: [
            "Church of Achiel's Light",
            "Church of Achiel",
            "High Church"
        ],
        href: "/campaign-notes/organizations/church-of-achiels-light.html"
    }
];
CAMPAIGN.places = [
    {
        id: "anash",
        name: "Anash",
        aliases: [
            "Anash"
        ],
        href: "/campaign-notes/places/othlorin/itholis/weinmere/anash.html"
    },
    {
        id: "wavethorn",
        name: "Wavethorn",
        aliases: [
            "Wavethorn"
        ],
        href: "/campaign-notes/places/othlorin/wavethorn-area/wavethorn.html"
    },
    {
        id: "niba",
        name: "Niba",
        aliases: [
            "Niba"
        ],
        href: "/campaign-notes/places/othlorin/niba/niba.html"
    }
];
CAMPAIGN.items = [
    {
        id: "cormac-spellbook",
        name: "Cormac's Spellbook",
        aliases: [
            "Cormac's Spellbook"
        ],
        href: "/campaign-notes/items/tomes/cormac-spellbook.html"
    }
];
CAMPAIGN.sessions = [
    {
        id: "ootid-session-1-and-2",
        name: "The Coup of Wavethorn",
        aliases: [
            "Coup of Wavethorn",
            "Coup of 200",
            "Wavethorn Coup",
            "OOTID Sessions 1 and 2"
        ],
        href: "/campaign-notes/sessions/order-of-the-iron-duch/session-1-and-2.html"
    }
];