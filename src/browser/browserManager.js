const { chromium } = require('playwright')
const config = require('../../config/config')

async function launchBrowser(options = {}) {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: Boolean(config.browser.headless),
    slowMo: config.browser.slowMo,
    args: ['--disable-blink-features=AutomationControlled'],
    ...options
  })
  return browser
}

async function createContext(browser, options = {}) {
  const context = await browser.newContext({
    viewport: config.browser.viewport,
    ...options
  })
  return context
}

async function createPage(context) {
  const page = await context.newPage()
  return page
}

async function closeBrowser(browser) {
  await browser.close()
}

module.exports = {
  launchBrowser,
  createContext,
  createPage,
  closeBrowser
}
