(function () {
    fetch('/campaign-data.json')
        .then(response => response.json())
        .then(data => {
            window.CAMPAIGN = data;
            // Dynamically load links.js after data is ready
            var script = document.createElement('script');
            script.src = '/links.js';
            document.head.appendChild(script);
        });
})();