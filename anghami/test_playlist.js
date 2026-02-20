const { launchBrowser, createContext, createPage, closeBrowser } = require('./src/browser/browserManager')
const { loadSession, saveSession, isSessionValid } = require('./src/browser/sessionManager')
const { scrapePlaylistSongsFlow } = require('./src/flows/anghami/scrapePlaylistSongsFlow')
const { executeLoginFlow } = require('./src/flows/anghami/loginFlow')
const { OutputBuilder } = require('./src/output/outputBuilder')
const { log, success, error } = require('./src/utils/logger')
const config = require('./config/config')

async function testScrapePlaylistSongs() {
  let browser, context, page

  try {
    log('=== Testing Scrape Playlist Songs Flow ===')
    
    browser = await launchBrowser()
    context = await createContext(browser)
    page = await createPage(context)
    
    log('=== Checking for existing session ===')
    const hasSession = await loadSession(context, config.paths.cookies)
    
    if (!hasSession || !(await isSessionValid(page))) {
      log('No valid session found, please login...')
      const loginResult = await executeLoginFlow(page)
      
      if (!loginResult.success) {
        throw new Error('Login failed')
      }
      
      await saveSession(context, config.paths.cookies)
      success('✓ Login completed and session saved')
    } else {
      success('✓ Existing session is valid, skipping login')
    }
    
    log('=== Navigating to Playlist Page ===')
    
    // IMPORTANT: Replace this URL with your actual playlist URL
    const playlistUrl = 'https://play.anghami.com/playlist/8515647'
    
    log(`Navigating to: ${playlistUrl}`)
    await page.goto(playlistUrl, { waitUntil: 'networkidle' })
    
    await page.waitForTimeout(2000)
    
    log('=== Running Scrape Playlist Songs Flow ===')
    
    const output = new OutputBuilder()
    
    const result = await scrapePlaylistSongsFlow(page, playlistUrl, output)
    
    if (result.success) {
      success('✓ Flow completed successfully!')
      
      if (result.playlistCard) {
        log('\n=== Playlist Summary ===')
        log(`  Name: ${result.playlistCard.name}`)
        log(`  ID: ${result.playlistCard.id}`)
        log(`  URL: ${result.playlistCard.url}`)
        log(`  Total Songs: ${result.playlistCard.songCount}`)
        log(`  Scraped At: ${result.playlistCard.scrapedAt}`)
        
        if (result.playlistCard.songCount > 0) {
          log('\n=== First 5 Songs ===')
          result.playlistCard.songs.slice(0, 5).forEach((song, index) => {
            log(`  ${index + 1}. ${song.title} - ${song.artist}${song.album ? ` (${song.album})` : ''}`)
          })
          
          if (result.playlistCard.songCount > 5) {
            log(`  ... and ${result.playlistCard.songCount - 5} more songs`)
          }
        }
      }
      
      log('\n=== Saving Results ===')
      const testOutputPath = 'data/output/test_playlist.json'
      await output.save(testOutputPath)
      success(`✓ Results saved to: ${testOutputPath}`)
      
    } else {
      error(`✗ Flow failed: ${result.message}`)
      if (result.error) {
        error(`Error details: ${result.error.message}`)
      }
    }
    
    log('\n=== Test Complete ===')
    log('Browser will remain open for inspection.')
    log('Press Ctrl+C to close.')
    
    await new Promise(() => {})
    
  } catch (err) {
    error('Test failed:', err.message)
    console.error(err)
  }
}

testScrapePlaylistSongs().catch(console.error)
