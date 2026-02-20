function log(message, ...args) {
  console.log(`[INFO] ${message}`, ...args)
}

function success(message, ...args) {
  console.log(`[SUCCESS] ${message}`, ...args)
}

function error(message, ...args) {
  console.error(`[ERROR] ${message}`, ...args)
}

function debug(message, ...args) {
  console.log(`[DEBUG] ${message}`, ...args)
}

module.exports = {
  log,
  success,
  error,
  debug
}
