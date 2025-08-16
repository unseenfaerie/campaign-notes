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
                        [1, 1, '-4'], [2, 2, '-2'], [3, 5, '-1'], [6, 15, '0'], [16, 17, '+1'], [18, 18, '+2']
                    ]
                },
                {
                    label: 'Open Doors (d20)', ranges: [
                        [1, 2, '1'], [3, 3, '2'], [4, 5, '3'], [6, 7, '4'], [8, 9, '5'], [10, 11, '6'], [12, 13, '7'], [14, 15, '8'], [16, 16, '9'], [17, 17, '10'], [18, 18, '11']
                    ]
                },
                {
                    label: 'Bend Bars', ranges: [
                        [1, 7, '0%'], [8, 9, '1%'], [10, 11, '10%'], [12, 13, '10%'], [14, 15, '10%'], [16, 16, '10%'], [17, 17, '10%'], [18, 18, '10%']
                    ]
                }
            ],
            dexterity: [
                {
                    label: 'React Adj', ranges: [
                        [1, 1, '-6'], [2, 2, '-4'], [3, 3, '-3'], [4, 4, '-2'], [5, 5, '-1'], [6, 15, '0'], [16, 16, '+1'], [17, 18, '+2']
                    ]
                },
                {
                    label: 'Missile Adj', ranges: [
                        [1, 1, '-6'], [2, 2, '-4'], [3, 3, '-3'], [4, 4, '-2'], [5, 5, '-1'], [6, 15, '0'], [16, 16, '+1'], [17, 18, '+2']
                    ]
                },
                {
                    label: 'Defense Adj', ranges: [
                        [1, 2, '+5'], [3, 3, '+4'], [4, 4, '+3'], [5, 5, '+2'], [6, 6, '+1'], [7, 14, '0'], [15, 15, '-1'], [16, 16, '-2'], [17, 17, '-3'], [18, 18, '-4']
                    ]
                }
            ],
            constitution: [
                {
                    label: 'Hit Pt. Adj', ranges: [
                        [1, 1, '-3'], [2, 3, '-2'], [4, 6, '-1'], [7, 14, '0'], [15, 15, '+1'], [16, 16, '+2'], [17, 17, '+2 (+3)'], [18, 18, '+2 (+4)']
                    ]
                },
                {
                    label: 'System Shock', ranges: [
                        [1, 1, '25%'], [2, 2, '30%'], [3, 3, '35%'], [4, 4, '40%'], [5, 5, '45%'], [6, 6, '50%'], [7, 7, '55%'], [8, 8, '60%'], [9, 9, '65%'], [10, 10, '70%'], [11, 11, '75%'], [12, 12, '80%'], [13, 13, '85%'], [14, 14, '88%'], [15, 15, '90%'], [16, 16, '95%'], [17, 17, '97%'], [18, 18, '99%']
                    ]
                },
                {
                    label: 'Res. Survival', ranges: [
                        [1, 1, '30%'], [2, 2, '35%'], [3, 3, '40%'], [4, 4, '45%'], [5, 5, '50%'], [6, 6, '55%'], [7, 7, '60%'], [8, 8, '65%'], [9, 9, '70%'], [10, 10, '75%'], [11, 11, '80%'], [12, 12, '85%'], [13, 13, '90%'], [14, 14, '92%'], [15, 15, '94%'], [16, 16, '96%'], [17, 17, '98%'], [18, 18, '100%']
                    ]
                }
            ],
            intelligence: [
                {
                    label: '# Languages', ranges: [
                        [1, 1, '0'], [2, 8, '1'], [9, 11, '2'], [12, 13, '3'], [14, 15, '4'], [16, 16, '5'], [17, 17, '6'], [18, 18, '7']
                    ]
                },
                {
                    label: 'Know Spell', ranges: [
                        [1, 8, '0%'], [9, 9, '35%'], [10, 10, '40%'], [11, 11, '45%'], [12, 12, '50%'], [13, 13, '55%'], [14, 14, '60%'], [15, 15, '65%'], [16, 16, '70%'], [17, 17, '75%'], [18, 18, '85%']
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
                    label: 'Magical Def Adj', ranges: [
                        [1, 1, '-6'], [2, 2, '-4'], [3, 3, '-3'], [4, 4, '-2'], [5, 7, '-1'], [8, 14, '0'], [15, 15, '+1'], [16, 16, '+2'], [17, 17, '+3'], [18, 18, '+4']
                    ]
                },
                {
                    label: 'Bonus Cleric Spells', ranges: [
                        [1, 12, '0'], [13, 13, '1 1st'], [14, 14, '2 1st'], [15, 15, '2 1st 1 2nd'], [16, 16, '2 1st 2 2nd'], [17, 17, '2 1st 2 2nd 1 3rd'], [18, 18, '2 1st 2 2nd 1 3rd 1 4th']
                    ]
                },
                {
                    label: 'Cleric Spell Failure', ranges: [
                        [1, 1, '80%'], [2, 2, '60%'], [3, 3, '50%'], [4, 4, '45%'], [5, 5, '40%'], [6, 6, '35%'], [7, 7, '30%'], [8, 8, '25%'], [9, 9, '20%'], [10, 10, '15%'], [11, 11, '10%'], [12, 12, '5%'], [13, 18, '0%']
                    ]
                }
            ],
            charisma: [
                {
                    label: 'Max Henchmen', ranges: [
                        [1, 1, '0'], [2, 4, '1'], [5, 6, '2'], [7, 8, '3'], [9, 11, '4'], [12, 13, '5'], [14, 14, '6'], [15, 15, '7'], [16, 16, '8'], [17, 17, '10'], [18, 18, '15']
                    ]
                },
                {
                    // full set of stats for future copies (i.e. different value for each stat)
                    label: 'Loyalty Base', ranges: [
                        [1, 1, '-8'], [2, 2, '-7'], [3, 3, '-6'], [4, 4, '-5'], [5, 5, '-4'], [6, 6, '-3'], [7, 7, '-2'], [8, 8, '-1'], [9, 9, '0'], [10, 10, '0'], [11, 11, '0'], [12, 12, '0'], [13, 13, '0'], [14, 14, '+1'], [15, 15, '+3'], [16, 16, '+4'], [17, 17, '+6'], [18, 18, '+8']
                    ]
                },
                {
                    label: 'Reaction Adj', ranges: [
                        [1, 1, '-7'], [2, 2, '-6'], [3, 3, '-5'], [4, 4, '-4'], [5, 5, '-3'], [6, 6, '-2'], [7, 7, '-1'], [8, 8, '0'], [9, 9, '0'], [10, 10, '0'], [11, 11, '0'], [12, 12, '0'], [13, 13, '+1'], [14, 14, '+2'], [15, 15, '+3'], [16, 16, '+5'], [17, 17, '+6'], [18, 18, '+7']
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