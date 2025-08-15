const linkEntries = [
    { href: "/places/othlorin/wavethorn/wavethorn.html", aliases: ["Wavethorn"] },
    { href: "/places/othlorin/itholis/weinmere/anash.html", aliases: ["Anash"] },
    { href: "/characters/player-characters/alann-barnett.html", aliases: ["Alann Barnett", "Alann"] },
    { href: "/characters/player-characters/releas-neb.html", aliases: ["Releas Scarnewman", "Releas", "Rel"] },
    { href: "/characters/player-characters/durchir.html", aliases: ["Durchir of the Angry Orchard", "Durchir"] },
    { href: "/characters/player-characters/cormac.html", aliases: ["Cormac"] },
    { href: "/characters/player-characters/constellis-tyrannus.html", aliases: ["Constellis Tyrannus", "Constellis"] },
    { href: "/characters/non-player-characters/bert-verinwort.html", aliases: ["Bert Verinwort", "Bert"] },
    { href: "/characters/non-player-characters/gereg.html", aliases: ["Gereg"] },
    { href: "/characters/non-player-characters/leo.html", aliases: ["Leo"] }
    // Add more as needed!
];

// Helper to find href by alias
function findHrefByAlias(alias) {
    for (const entry of linkEntries) {
        if (entry.aliases.includes(alias)) {
            return entry.href;
        }
    }
    return null;
}

// Replace [LinkText] with <a href="...">LinkText</a>
function autoLinkContent() {
    document.querySelectorAll('.content').forEach(section => {
        section.innerHTML = section.innerHTML.replace(
            /\[([^\]]+)\]/g,
            (match, p1) => {
                const href = findHrefByAlias(p1);
                return href ? `<a href="${href}">${p1}</a>` : match;
            }
        );
    });
}

// Run after DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoLinkContent);
} else {
    autoLinkContent();
}