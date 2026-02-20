const { waitForElement } = require('../actions/waits')
const { scrollToLoadAll } = require('../actions/scrolling')
const { log, success, error } = require('../../utils/logger')
const { SongCard } = require('../../models/SongCard')
const { PlaylistCard } = require('../../models/PlaylistCard')

async function scrapePlaylistSongsFlow(page, playlistUrl, outputBuilder) {
  try {
    log('Step 1/7: Verifying playlist page is loaded...')
    
    const currentUrl = page.url()
    if (!currentUrl.includes('/playlist/')) {
      return {
        success: false,
        message: 'Not on a playlist page'
      }
    }
    
    await waitForElement(page, 'button.anghami-default-btn-new.primary.texted:has-text("Play")', {
      state: 'visible',
      timeout: 10000
    })
    
    success('✓ Playlist page loaded')

    log('Step 2/7: Extracting playlist metadata...')
    
    const url = page.url()
    const idMatch = url.match(/\/playlist\/(\d+)/)
    const playlistId = idMatch ? idMatch[1] : null
    
    if (!playlistId) {
      return {
        success: false,
        message: 'Failed to extract playlist ID from URL'
      }
    }
    
    let playlistName = 'Unknown Playlist'
    try {
      const nameElement = page.locator('.collection-title h1, div.collection-title h1').first()
      playlistName = (await nameElement.textContent()).trim()
    } catch (err) {
      log('⚠ Could not extract playlist name, using default')
    }
    
    const playlistCard = new PlaylistCard({
      id: playlistId,
      name: playlistName,
      url: url
    })
    
    if (!playlistCard.isValid()) {
      return {
        success: false,
        message: 'Failed to create valid PlaylistCard'
      }
    }
    
    log(`  Playlist: ${playlistCard.toString()}`)
    success('✓ Playlist metadata extracted')

    log('Step 3/7: Locating songs container...')
    
    try {
      await waitForElement(page, '#scroll_window .view-content, #scroll_window > view-parent > normal-view > div > div.view-content', {
        state: 'visible',
        timeout: 10000
      })
      
      await waitForElement(page, 'a.table-row', {
        state: 'visible',
        timeout: 10000
      })
      
      const initialCount = await page.locator('a.table-row').count()
      log(`  Initial songs loaded: ${initialCount}`)
      success('✓ Songs container located')
      
    } catch (err) {
      log('⚠ No songs found - playlist might be empty')
      return {
        success: true,
        message: 'Empty playlist',
        playlistCard: playlistCard
      }
    }

    log('Step 4/7: Scrolling to load all songs...')
    
    const scrollResult = await scrollToLoadAll(page, {
      elementSelector: 'a.table-row',
      maxScrolls: 100,
      itemName: 'songs'
    })

    log('Step 5/7: Extracting song elements...')
    
    const songRows = await page.locator('a.table-row').all()
    
    if (songRows.length === 0) {
      log('⚠ Empty playlist - no songs found')
      return {
        success: true,
        message: 'Empty playlist',
        playlistCard: playlistCard
      }
    }
    
    success(`✓ Found ${songRows.length} songs`)

    log('Step 6/7: Extracting song details...')
    
    let extracted = 0
    
    for (const row of songRows) {
      try {
        const titleElement = row.locator('div.cell-title span')
        const title = (await titleElement.textContent()).trim()
        
        const artistElement = row.locator('div.cell-artist a')
        const artist = (await artistElement.textContent()).trim()
        
        let album = null
        try {
          const albumElement = row.locator('div.cell-album a')
          album = (await albumElement.textContent()).trim()
        } catch (err) {
          // Album not available
        }
        
        let url = null
        try {
          url = await row.getAttribute('href')
        } catch (err) {
          // URL not available
        }
        
        const songCard = new SongCard({
          title,
          artist,
          album,
          url
        })
        
        if (songCard.isValid()) {
          playlistCard.addSong(songCard)
          extracted++
        }
        
        if (extracted % 50 === 0) {
          log(`  Extracted ${extracted}/${songRows.length} songs...`)
        }
        
      } catch (err) {
        error(`Failed to extract song: ${err.message}`)
      }
    }
    
    success(`✓ Extracted ${playlistCard.songCount} songs`)

    log('Step 7/7: Storing playlist data...')
    
    const playlistJSON = playlistCard.toJSON()
    outputBuilder.addPlaylist(playlistJSON)
    
    success(`✓ Playlist "${playlistCard.name}" added with ${playlistCard.songCount} songs`)
    
    return {
      success: true,
      message: 'Scrape playlist songs completed successfully',
      playlistCard: playlistCard
    }

  } catch (err) {
    error('Scrape playlist songs failed:', err.message)
    return {
      success: false,
      message: 'Scrape playlist songs failed',
      error: err
    }
  }
}

module.exports = { scrapePlaylistSongsFlow }
