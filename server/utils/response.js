function success(data = {}, message = 'success') {
  return {
    code: 0,
    message,
    data
  };
}

function fail(code = 500, message = 'server error', data = null) {
  return {
    code,
    message,
    data
  };
}

module.exports = {
  success,
  fail
};
