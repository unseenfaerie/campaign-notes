#!/bin/bash
# update-campaign.sh
# Run all campaign maintenance scripts in the correct order

set -e

# 1. Generate missing pages for new objects
node generate-pages.js

# 2. Generate index pages for directories
node generate-indexes.js

# 3. Remove existing alias brackets (if you have a script for this, e.g., remove-alias-brackets.js)
if [ -f remove-alias-brackets.js ]; then
  node remove-alias-brackets.js
fi

# 4. Auto-link aliases (bracket plain aliases)
node auto-link-aliases.js

echo "Campaign content updated!"
