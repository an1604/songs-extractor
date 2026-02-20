const { launchBrowser, createContext, createPage } = require('./browser/browserManager')
const { executeYouTubeLoginFlow } = require('./flows/youtube/youtubeLoginFlow')
const { loadYouTubeSession, isYouTubeSessionValid } = require('./browser/sessionManager')
const config = require('../config/config')
const { log, success } = require('./utils/logger')

async function main() {
  const browser = await launchBrowser()
  const context = await createContext(browser)
  const page = await createPage(context)

  const hasSession = await loadYouTubeSession(context, config.paths.youtubeCookies)
  if (hasSession.success) {
    await page.goto(config.urls.youtube.base, { waitUntil: 'domcontentloaded' })
    if (await isYouTubeSessionValid(page)) {
      success('Using saved YouTube session')
      log('Press Ctrl+C to close browser.')
      await new Promise(() => {})
      return
    }
  }

  const result = await executeYouTubeLoginFlow(page, context)
  if (result.success) {
    success('Login completed!')
  }
  log('Press Ctrl+C to close browser.')
  await new Promise(() => {})
}
main().catch(console.error)
