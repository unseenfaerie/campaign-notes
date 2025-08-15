const navLinks = [
    { name: "Home", url: "/index.html" },
    { name: "Characters", url: "/characters/characters.html" },
    { name: "Places", url: "/places/places.html" },
    { name: "Sessions", url: "/sessions/sessions.html" }
];

function createSidebar() {
    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';

    const navTitle = document.createElement('h2');
    navTitle.textContent = 'Navigation';
    sidebar.appendChild(navTitle);

    const ul = document.createElement('ul');
    navLinks.forEach(link => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = link.url;
        a.textContent = link.name;
        li.appendChild(a);
        ul.appendChild(li);
    });
    sidebar.appendChild(ul);

    // Insert sidebar into the container
    const container = document.querySelector('.container');
    if (container) {
        // Remove existing sidebar if present
        const oldSidebar = container.querySelector('.sidebar');
        if (oldSidebar) oldSidebar.remove();

        // Insert at the beginning of the container
        container.insertBefore(sidebar, container.firstChild);
    }
}

// Run after DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createSidebar);
} else {
    createSidebar();
}