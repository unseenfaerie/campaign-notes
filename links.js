(function () {
    // Wait until CAMPAIGN data is loaded
    if (!window.CAMPAIGN) {
        console.error("CAMPAIGN data not loaded!");
        return;
    }

    // Build alias-to-href map
    const aliasToHref = {};
    for (const group of ['characters', 'places']) {
        (window.CAMPAIGN[group] || []).forEach(item => {
            (item.aliases || []).forEach(alias => {
                aliasToHref[alias] = item.href;
            });
        });
    }

    // Helper: recursively walk text nodes and replace [Alias] with <a>
    function linkifyBrackets(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            // Find all [Alias] in this text node
            const regex = /\[([^\[\]]+)\]/g;
            let match, lastIndex = 0;
            const parent = node.parentNode;
            const frag = document.createDocumentFragment();
            let text = node.nodeValue;
            let changed = false;

            while ((match = regex.exec(text)) !== null) {
                const alias = match[1];
                const href = aliasToHref[alias];
                if (href) {
                    // Text before the match
                    if (match.index > lastIndex) {
                        frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
                    }
                    // The link
                    const a = document.createElement('a');
                    a.href = href;
                    a.textContent = alias;
                    frag.appendChild(a);
                    lastIndex = regex.lastIndex;
                    changed = true;
                }
            }
            // Text after the last match
            if (changed) {
                if (lastIndex < text.length) {
                    frag.appendChild(document.createTextNode(text.slice(lastIndex)));
                }
                parent.replaceChild(frag, node);
            }
        } else if (node.nodeType === Node.ELEMENT_NODE && node.childNodes) {
            // Don't process inside <a> tags (avoid double-linking)
            if (node.tagName === 'A') return;
            // Recursively process children
            // Use Array.from to avoid live NodeList issues when replacing nodes
            Array.from(node.childNodes).forEach(linkifyBrackets);
        }
    }

    // Run on all content inside <main class="content">, or body if not found
    const root = document.querySelector('main.content') || document.body;
    linkifyBrackets(root);
})();