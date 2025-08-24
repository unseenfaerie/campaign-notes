function validateIdFormat(test_string) {
    // only allow undercase and dashes
    console.log('Testing: ' + test_string);
    let res = /^[a-z-]+$/.test(test_string);
    console.log(res);
    return res;
}

module.exports = {
    validateIdFormat
}
