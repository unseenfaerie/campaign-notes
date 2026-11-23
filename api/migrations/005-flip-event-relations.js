module.exports = {
    version: 5,
    description: 'Make character and organization event relations outgoing',

    async up() {
        // Existing tables and rows already contain both member columns; only manifest
        // relation identity and perspective changed.
    },
};
