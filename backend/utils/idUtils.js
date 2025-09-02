function validateIdFormat(test_string) {
    // only allow undercase and dashes
    let res = /^[a-z-]+$/.test(test_string);
    return res;
}

module.exports = {
    validateIdFormat
}
