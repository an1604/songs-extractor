const { withRetry } = require('../utils/retry')
const config = require('../../config/config')

async function waitForElement(page, selector, options = {}) {
  const timeout = options.timeout || config.timeouts.element
  const state = options.state || 'visible'
  const useFirst = options.first === true

  const result = await withRetry(async () => {
    let locator = page.locator(selector)
    if (useFirst) {
      locator = locator.first()
    }
    await locator.waitFor({ state, timeout })
    return true
  }, options.retry)

  return result
}

async function waitForText(page, text, options = {}) {
  const timeout = options.timeout || config.timeouts.element

  const result = await withRetry(async () => {
    const locator = page.locator(`text=${text}`)
    await locator.waitFor({ state: 'visible', timeout })
    return true
  }, options.retry)

  return result
}

async function waitForNavigation(page, options = {}) {
  const timeout = options.timeout || config.timeouts.navigation

  const result = await withRetry(async () => {
    await page.waitForLoadState('networkidle', { timeout })
    return true
  }, options.retry)

  return result
}

async function waitForTimeout(ms) {
  await new Promise(resolve => setTimeout(resolve, ms))
  return { success: true, data: true }
}

module.exports = {
  waitForElement,
  waitForText,
  waitForNavigation,
  waitForTimeout
}
