const { withRetry } = require('../utils/retry')
const config = require('../../config/config')

async function goTo(page, url, options = {}) {
  const timeout = options.timeout || config.timeouts.navigation

  const result = await withRetry(async () => {
    await page.goto(url, {
      timeout,
      waitUntil: 'networkidle'
    })
    return true
  }, options.retry)

  return result
}

async function reload(page, options = {}) {
  const timeout = options.timeout || config.timeouts.navigation

  const result = await withRetry(async () => {
    await page.reload({
      timeout,
      waitUntil: 'networkidle'
    })
    return true
  }, options.retry)

  return result
}

async function goBack(page, options = {}) {
  const timeout = options.timeout || config.timeouts.navigation

  const result = await withRetry(async () => {
    await page.goBack({
      timeout,
      waitUntil: 'networkidle'
    })
    return true
  }, options.retry)

  return result
}

module.exports = {
  goTo,
  reload,
  goBack
}
