const { clickElement } = require('../actions/clicks')
const { waitForElement } = require('../actions/waits')
const { scrollToLoadAll } = require('../actions/scrolling')
const { scrapePlaylistSongsFlow } = require('../scrapePlaylistSongsFlow')
const { log, success, error } = require('../../utils/logger')

async function scrapeAllPlaylistsFlow(page, outputBuilder) {
  try {
    log('Step 1/6: Clicking "Playlists" category...')
    
    const playlistsSelector = 'div.menu-tab-item:has-text("Playlists")'
    const clickResult = await clickElement(page, playlistsSelector)
    
    if (!clickResult.success) {
      return {
        success: false,
        message: 'Failed to click Playlists category',
        error: clickResult.error
      }
    }
    
    await waitForElement(page, '.mymusic-displayed-content', {
      state: 'visible',
      timeout: 10000
    })
    
    success('✓ "Playlists" category selected')

    log('Step 2/6: Scrolling to load all playlist cards...')
    
    const scrollResult = await scrollToLoadAll(page, {
      elementSelector: 'div.position-relative:has(a.card-item-image-container[href*="/playlist/"])',
      maxScrolls: 50,
      itemName: 'playlists'
    })

    log('Step 3/6: Extracting playlist card elements...')
    
    const playlistCards = await page.locator('div.position-relative:has(a.card-item-image-container[href*="/playlist/"])').all()
    
    if (playlistCards.length === 0) {
      log('⚠ No playlists found')
      return {
        success: true,
        message: 'No playlists to scrape',
        totalPlaylists: 0,
        totalSongs: 0,
        playlists: []
      }
    }
    
    success(`✓ Found ${playlistCards.length} playlist cards`)

    log('Step 4/6: Extracting playlist metadata from cards...')
    
    const playlistLinks = []
    
    for (const card of playlistCards) {
      try {
        const linkElement = card.locator('a.card-item-image-container[href*="/playlist/"]')
        const href = await linkElement.getAttribute('href')
        const playlistUrl = href.startsWith('http') ? href : `https://play.anghami.com${href}`
        
        const nameElement = card.locator('a.card-item-title')
        const playlistName = (await nameElement.textContent()).trim()
        
        let songCountPreview = null
        try {
          const subtitleElement = card.locator('div.card-item-subtitle')
          songCountPreview = (await subtitleElement.textContent()).trim()
        } catch (err) {
          // Song count not available
        }
        
        playlistLinks.push({
          url: playlistUrl,
          name: playlistName,
          songCountPreview: songCountPreview,
          index: playlistLinks.length
        })
        
      } catch (err) {
        error(`Failed to extract playlist card: ${err.message}`)
      }
    }
    
    success(`✓ Extracted ${playlistLinks.length} playlist links`)

    log('Step 5/6: Iterating through playlists and scraping songs...')
    
    const scrapedPlaylists = []
    let totalSongsScraped = 0
    
    for (let i = 0; i < playlistLinks.length; i++) {
      const playlist = playlistLinks[i]
      
      try {
        log(`[${i + 1}/${playlistLinks.length}] Scraping: ${playlist.name}`)
        
        await page.goto(playlist.url, { waitUntil: 'domcontentloaded' })
        await page.waitForTimeout(2000)
        
        const result = await scrapePlaylistSongsFlow(page, playlist.url, outputBuilder)
        
        if (result.success) {
          scrapedPlaylists.push(result.playlistCard)
          totalSongsScraped += result.playlistCard.songCount
          
          success(`✓ ${result.playlistCard.toString()}`)
        } else {
          error(`✗ Failed to scrape "${playlist.name}": ${result.message}`)
        }
        
        log('  Returning to playlists page...')
        await page.goto('https://play.anghami.com/mymusic', { waitUntil: 'domcontentloaded' })
        
        await waitForElement(page, '.mymusic-displayed-content', {
          state: 'visible',
          timeout: 10000
        })
        
        await clickElement(page, 'div.menu-tab-item:has-text("Playlists")')
        await page.waitForTimeout(1000)
        
      } catch (err) {
        error(`Failed to process playlist "${playlist.name}": ${err.message}`)
      }
    }
    
    success(`✓ Scraped ${scrapedPlaylists.length}/${playlistLinks.length} playlists`)
    success(`✓ Total songs: ${totalSongsScraped}`)

    log('Step 6/6: Returning summary...')
    
    return {
      success: true,
      message: `Scraped ${scrapedPlaylists.length} playlists with ${totalSongsScraped} total songs`,
      totalPlaylists: scrapedPlaylists.length,
      totalSongs: totalSongsScraped,
      playlists: scrapedPlaylists
    }

  } catch (err) {
    error('Scrape all playlists failed:', err.message)
    return {
      success: false,
      message: 'Scrape all playlists failed',
      error: err
    }
  }
}

module.exports = { scrapeAllPlaylistsFlow }
