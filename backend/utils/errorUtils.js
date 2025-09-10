const ERROR_CODES = require('../../common/errorCodes')

function mapErrorToStatus(err) {
  switch (err.code) {
    case ERROR_CODES.DUPLICATE_ID:
      return 409;
    case ERROR_CODES.NOT_FOUND:
      return 404;
    case ERROR_CODES.ENTITY_VALIDATION_FAILED:
    case ERROR_CODES.BUSINESS_LOGIC_FAILED:
    case ERROR_CODES.INVALID_ID:
      return 400;
    default:
      return 500;
  }
}

module.exports = {
  mapErrorToStatus
}