(function () {
    // Adjust this if your top-level index is not named 'index.html'
    const TOP_INDEX = '/index.html';

    // Helper to capitalize and prettify directory names
    function prettify(name) {
        return name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    // Get the path parts between root and current file
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts.length === 0) return; // Already at root

    // Build breadcrumbs
    let breadcrumbs = [];
    let currentPath = '';
    for (let i = 0; i < pathParts.length - 1; i++) {
        currentPath += '/' + pathParts[i];
        // Each directory's index is assumed to be named after the directory (e.g., /places/places.html)
        const indexFile = `${currentPath}/${pathParts[i]}.html`;
        breadcrumbs.push(`<a href="${indexFile}">${prettify(pathParts[i])}</a>`);
    }

    // Add the current page (not a link)
    const currentPage = pathParts[pathParts.length - 1].replace(/\.html$/, '');
    breadcrumbs.push(`<span>${prettify(currentPage)}</span>`);

    // Insert into the page
    const content = document.querySelector('.content');
    if (content) {
        const nav = document.createElement('nav');
        nav.className = 'breadcrumbs';
        nav.innerHTML = breadcrumbs.join(' &raquo; ');
        content.insertBefore(nav, content.firstChild);
    }
})();