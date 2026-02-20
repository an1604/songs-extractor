const { launchBrowser, createContext, createPage } = require('./browser/browserManager')
const { executeYouTubeLoginFlow } = require('./flows/youtube/youtubeLoginFlow')
const { addAllSongsToLikesFlow } = require('./flows/youtube/youtubeAddAllSongsToLikesFlow')
const { loadYouTubeSession, isYouTubeSessionValid } = require('./browser/sessionManager')
const config = require('../config/config')
const { log, success, error } = require('./utils/logger')

const MAX_SONGS = process.env.MAX_SONGS ? parseInt(process.env.MAX_SONGS, 10) : undefined

async function main() {
  let browser

  try {
    log('Starting YouTube Add All Songs to Likes Flow...')

    browser = await launchBrowser()
    const context = await createContext(browser)
    const page = await createPage(context)

    log('Browser launched successfully')

    // === YOUTUBE SESSION CHECK & LOGIN ===
    log('=== Checking for existing YouTube session ===')
    const loadResult = await loadYouTubeSession(context, config.paths.youtubeCookies)

    let needsLogin = true

    if (loadResult.success) {
      log('YouTube session cookies loaded, verifying validity...')
      await page.goto(config.urls.youtube.base, { waitUntil: 'domcontentloaded' })
      const isValid = await isYouTubeSessionValid(page)

      if (isValid) {
        success('✓ Existing YouTube session is valid, skipping login')
        needsLogin = false
      } else {
        log('YouTube session expired, login required')
      }
    } else {
      log('No existing YouTube session found, login required')
    }

    if (needsLogin) {
      log('=== Running YouTube Login Flow ===')
      const loginResult = await executeYouTubeLoginFlow(page, context)

      if (loginResult.success) {
        success('YouTube login completed:', loginResult.message)
      } else {
        error('YouTube login failed:', loginResult.message)
        if (loginResult.error) {
          error('Error details:', loginResult.error.message)
        }
        return
      }
    }

    // === ADD ALL SONGS TO LIKES FLOW ===
    log('=== Running Add All Songs to Likes Flow ===')
    const addResult = await addAllSongsToLikesFlow(page, {
      songsFilePath: config.paths.output,
      delayBetweenSongs: 2500,
      maxSongs: MAX_SONGS
    })

    log('')
    log('=== Final Summary ===')
    log(`✓ Total processed: ${addResult.totalProcessed}`)
    log(`✓ Added: ${addResult.added}`)
    log(`✓ Skipped (already liked): ${addResult.skipped}`)
    log(`✓ Failed: ${addResult.failed}`)
    if (addResult.errors.length > 0) {
      log('')
      log('Failed songs:')
      addResult.errors.forEach((e, i) => log(`  ${i + 1}. ${e.song}: ${e.message}`))
    }

    // Keep browser open for inspection
    log('')
    log('Press Ctrl+C to close browser.')
    await new Promise(() => {}) // Keep process alive

  } catch (err) {
    error('Fatal error:', err.message)
    console.error(err)
    throw err
  }
}

main().catch(console.error)
