
// 1. Load CAMPAIGN data from global-data.js


const globalDataJs = fs.readFileSync(path.join(ROOT, 'campaign-data.js'), 'utf8');

const campaignMatch = globalDataJs.match(/window\.CAMPAIGN\s*=\s*({[\s\S]*?});/);

if (!campaignMatch) {
    console.error('Could not find CAMPAIGN object in campaign-data.js');
    process.exit(1);
}

// run campaign-data.js
eval('(' + campaignMatch[1] + ')'); // Safe if you control the file


const campaign = eval('(' + campaignMatch[1] + ')'); // Safe if you control the file

(function () {
    //load campaign data from campaign-data.js
    fetch('/campaign-data.js')
        .then(response => response.text())
        .then(text => {
            eval(text);
            window.CAMPAIGN = campaignData;
            // Dynamically load links.js after data is ready
            var script = document.createElement('script');
            script.src = '/links.js';
            document.head.appendChild(script);
            //Dynamically load render-statblock.js after data is ready
            var statblockScript = document.createElement('script');
            statblockScript.src = '/render-statblock.js';
            document.head.appendChild(statblockScript);
        });
})();