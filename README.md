How to add new pages:
1. Add the data for the page to campaign-data.js, deciding the href here
2. Run generate-pages.js to create the new page using the template most local to the new file's destination (traversing upward from there if no template is found)
3. Run generate-indexes.js to add this page to relevant indexes
4. (Optional) Run remove-alias-brackets.js to start fresh for links
5. Run auto-link-aliases.js to add links to the new page as well as create links within the new page
