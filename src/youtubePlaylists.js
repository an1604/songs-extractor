const { launchBrowser, createContext, createPage } = require('./browser/browserManager')
const { executeYouTubeLoginFlow } = require('./flows/youtube/youtubeLoginFlow')
const { addPlaylistsFlow } = require('./flows/youtube/youtubeAddPlaylistsFlow')
const { loadYouTubeSession, isYouTubeSessionValid } = require('./browser/sessionManager')
const config = require('../config/config')
const { log, success, error } = require('./utils/logger')

const MAX_PLAYLISTS = process.env.MAX_PLAYLISTS ? parseInt(process.env.MAX_PLAYLISTS, 10) : undefined
const MAX_SONGS_PER_PLAYLIST = process.env.MAX_SONGS_PER_PLAYLIST ? parseInt(process.env.MAX_SONGS_PER_PLAYLIST, 10) : undefined

async function main() {
  let browser

  try {
    log('Starting YouTube Add Playlists Flow...')

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

    // === ADD PLAYLISTS FLOW ===
    log('=== Running Add Playlists Flow ===')
    const addResult = await addPlaylistsFlow(page, {
      songsFilePath: config.paths.output,
      delayBetweenSongs: 2500,
      maxPlaylists: MAX_PLAYLISTS,
      maxSongsPerPlaylist: MAX_SONGS_PER_PLAYLIST
    })

    log('')
    log('=== Final Summary ===')
    log(`✓ Total playlists: ${addResult.totalPlaylists}`)
    log(`✓ Total songs processed: ${addResult.totalSongs}`)
    log(`✓ Added: ${addResult.added}`)
    log(`✓ Skipped (already in playlist): ${addResult.skipped}`)
    log(`✓ Failed: ${addResult.failed}`)
    if (addResult.errors.length > 0) {
      log('')
      log('Failed items:')
      addResult.errors.forEach((e, i) => {
        const label = e.song ? `${e.playlist} / ${e.song}` : e.playlist || 'N/A'
        log(`  ${i + 1}. ${label}: ${e.message}`)
      })
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
