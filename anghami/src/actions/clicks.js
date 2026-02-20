const { withRetry } = require('../utils/retry')
const config = require('../../config/config')

async function clickElement(page, selector, options = {}) {
  const timeout = options.timeout || config.timeouts.click

  const result = await withRetry(async () => {
    const locator = page.locator(selector)
    await locator.click({ timeout })
    return true
  }, options.retry)

  return result
}

async function doubleClick(page, selector, options = {}) {
  const timeout = options.timeout || config.timeouts.click

  const result = await withRetry(async () => {
    const locator = page.locator(selector)
    await locator.dblclick({ timeout })
    return true
  }, options.retry)

  return result
}

async function rightClick(page, selector, options = {}) {
  const timeout = options.timeout || config.timeouts.click

  const result = await withRetry(async () => {
    const locator = page.locator(selector)
    await locator.click({ button: 'right', timeout })
    return true
  }, options.retry)

  return result
}

module.exports = {
  clickElement,
  doubleClick,
  rightClick
}
