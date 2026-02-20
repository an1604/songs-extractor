const config = require('../../config/config')

async function withRetry(fn, options = {}) {
  const {
    maxAttempts = config.retry.maxAttempts,
    initialDelay = config.retry.initialDelay,
    backoffMultiplier = config.retry.backoffMultiplier,
    maxDelay = config.retry.maxDelay
  } = options

  let lastError

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn()
      return { success: true, data: result }
    } catch (error) {
      lastError = error
      
      if (attempt === maxAttempts) {
        break
      }

      const delay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, attempt - 1),
        maxDelay
      )
      
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  return {
    success: false,
    error: lastError
  }
}

module.exports = { withRetry }
