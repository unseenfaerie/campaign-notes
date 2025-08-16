(function () {
    // Helper to capitalize and prettify directory names
    function prettify(name) {
        return name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    // Get the path parts between root and current file
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    if (pathParts.length === 0) return; // Already at root

    // Determine if current page is an index page (e.g., /places/places.html)
    const currentFile = pathParts[pathParts.length - 1];
    const parentDir = pathParts.length > 1 ? pathParts[pathParts.length - 2] : null;
    const isIndexPage = parentDir && currentFile === `${parentDir}.html`;

    // Build breadcrumbs
    let breadcrumbs = [];
    let currentPath = '';
    // Only go up to the parent if this is an index page
    const end = isIndexPage ? pathParts.length - 1 : pathParts.length;
    for (let i = 0; i < end - 1; i++) {
        currentPath += '/' + pathParts[i];
        const indexFile = `${currentPath}/${pathParts[i]}.html`;
        breadcrumbs.push(`<a href="${indexFile}">${prettify(pathParts[i])}</a>`);
    }

    // Add the current page (not a link), unless it's an index page
    if (!isIndexPage) {
        const currentPage = pathParts[pathParts.length - 1].replace(/\.html$/, '');
        breadcrumbs.push(`<span>${prettify(currentPage)}</span>`);
    } else if (end > 0) {
        // For index pages, show the parent directory as the last breadcrumb (not a link)
        breadcrumbs.push(`<span>${prettify(parentDir)}</span>`);
    }

    // Insert into the page
    const content = document.querySelector('.content');
    if (content) {
        const nav = document.createElement('nav');
        nav.className = 'breadcrumbs';
        nav.innerHTML = breadcrumbs.join(' &raquo; ');
        content.insertBefore(nav, content.firstChild);
    }
})();