(function () {
    // Helper to get value from a range table
    function getFromRanges(val, ranges) {
        for (const [min, max, result] of ranges) {
            if (val >= min && val <= max) return result;
        }
        return '';
    }

    function renderStatblock() {
        if (!window.CAMPAIGN) return;

        const path = window.location.pathname;
        const match = path.match(/\/player-characters\/([^/.]+)/);
        if (!match) return;
        const charId = match[1];

        const character = (window.CAMPAIGN.playerCharacters || []).find(c => c.id === charId);
        if (!character || !character.statblock) return;

        // Define stat modifiers as [min, max, result]
        const statDetails = {
            strength: [
                {
                    label: 'Hit. Adj', ranges: [
                        [1, 1, '-5'], [2, 3, '-3'], [4, 5, '-2'], [6, 7, '-1'], [8, 16, '0'], [17, 18, '+1']
                    ]
                },
                {
                    label: 'Dam. Adj', ranges: [
                        [1, 1, '-4'], [2, 2, '-2'], [3, 5, '-1'], [6, 15, '0'], [16, 17, '+1'], [18, 18, '2']
                    ]
                },
                {
                    label: 'Open Doors', ranges: [
                        [3, 15, '5'], [16, 17, '6'], [18, 18, '7']
                    ]
                },
                {
                    label: 'Bend Bars', ranges: [
                        [3, 15, '1%'], [16, 17, '5%'], [18, 18, '10%']
                    ]
                }
            ],
            dexterity: [
                {
                    label: 'React Adj', ranges: [
                        [3, 5, '-2'], [6, 8, '-1'], [9, 14, '0'], [15, 17, '+1'], [18, 18, '+2']
                    ]
                },
                {
                    label: 'Missile Adj', ranges: [
                        [3, 7, '-1'], [8, 15, '0'], [16, 17, '+1'], [18, 18, '+2']
                    ]
                },
                {
                    label: 'Defense Adj', ranges: [
                        [3, 5, '+1'], [6, 14, '0'], [15, 17, '-1'], [18, 18, '-2']
                    ]
                }
            ],
            constitution: [
                {
                    label: 'Hit Pt. Adj', ranges: [
                        [3, 6, '-2'], [7, 14, '0'], [15, 16, '+1'], [17, 17, '+2'], [18, 18, '+3']
                    ]
                },
                {
                    label: 'System Shock', ranges: [
                        [3, 6, '55%'], [7, 14, '70%'], [15, 16, '85%'], [17, 17, '90%'], [18, 18, '95%']
                    ]
                },
                {
                    label: 'Res. Survival', ranges: [
                        [3, 6, '60%'], [7, 14, '75%'], [15, 16, '90%'], [17, 17, '95%'], [18, 18, '99%']
                    ]
                }
            ],
            intelligence: [
                {
                    label: 'Add. Lang', ranges: [
                        [3, 7, '0'], [8, 11, '1'], [12, 15, '2'], [16, 17, '3'], [18, 18, '4']
                    ]
                },
                {
                    label: 'Know Spell', ranges: [
                        [3, 7, '35%'], [8, 11, '50%'], [12, 15, '65%'], [16, 17, '85%'], [18, 18, '95%']
                    ]
                },
                {
                    label: 'Max Spells', ranges: [
                        [3, 7, '6'], [8, 11, '9'], [12, 15, '12'], [16, 17, '15'], [18, 18, '18']
                    ]
                },
                {
                    label: 'Min Spells', ranges: [
                        [3, 7, '0'], [8, 11, '1'], [12, 15, '2'], [16, 17, '3'], [18, 18, '4']
                    ]
                }
            ],
            wisdom: [
                {
                    label: 'Magical Atk Adj', ranges: [
                        [3, 7, '-1'], [8, 14, '0'], [15, 17, '+1'], [18, 18, '+2']
                    ]
                },
                {
                    label: 'Bonus Spells', ranges: [
                        [3, 12, '0'], [13, 14, '1'], [15, 16, '2'], [17, 17, '3'], [18, 18, '4']
                    ]
                },
                {
                    label: 'Spell Failure', ranges: [
                        [3, 7, '80%'], [8, 14, '50%'], [15, 17, '20%'], [18, 18, '0%']
                    ]
                }
            ],
            charisma: [
                {
                    label: 'Max Henchmen', ranges: [
                        [3, 4, '1'], [5, 6, '2'], [7, 8, '3'], [9, 12, '4'], [13, 15, '5'], [16, 17, '6'], [18, 18, '7']
                    ]
                },
                {
                    label: 'Loyalty Base', ranges: [
                        [3, 4, '-8'], [5, 6, '-4'], [7, 8, '-2'], [9, 12, '0'], [13, 15, '+1'], [16, 17, '+3'], [18, 18, '+4']
                    ]
                },
                {
                    label: 'Reaction Adj', ranges: [
                        [3, 4, '-7'], [5, 6, '-3'], [7, 8, '-1'], [9, 12, '0'], [13, 15, '+1'], [16, 17, '+2'], [18, 18, '+3']
                    ]
                }
            ]
        };

        // Generate the table HTML
        let html = `<table class="fullstatblock">\n`;
        for (const [stat, value] of Object.entries(character.statblock)) {
            html += `  <tr>\n    <th>${stat.toUpperCase().slice(0, 3)}</th>\n    <td>${value}</td>\n`;
            if (statDetails[stat]) {
                for (const detail of statDetails[stat]) {
                    html += `    <td>${detail.label}: ${getFromRanges(value, detail.ranges)}</td>\n`;
                }
            }
            html += `  </tr>\n`;
        }
        html += `</table>\n`;

        // Insert into the page
        let container = document.querySelector('table.fullstatblock');
        if (container) {
            container.outerHTML = html;
        } else {
            container = document.getElementById('statblock');
            if (container) container.innerHTML = html;
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', renderStatblock);
    } else {
        renderStatblock();
    }
})();