const { clickElement } = require('../actions/clicks')
const { waitForElement } = require('../actions/waits')
const { scrollToLoadAll } = require('../actions/scrolling')
const { log, success, error } = require('../../utils/logger')
const { SongCard } = require('../../models/SongCard')

async function scrapeLikesFlow(page, outputBuilder) {
  try {
    log('Step 1/5: Selecting "Likes" category...')
    
    const likesSelector = 'div.menu-tab-item:has-text("Likes")'
    const clickResult = await clickElement(page, likesSelector)
    
    if (!clickResult.success) {
      return { success: false, message: 'Failed to click Likes category', error: clickResult.error }
    }
    
    success('✓ "Likes" category selected')

    log('Step 2/5: Waiting for liked songs to load...')
    
    await waitForElement(page, 'a.table-row', {
      state: 'visible',
      timeout: 10000
    })
    
    success('✓ Initial songs loaded')

    log('Step 3/5: Scrolling to load all songs...')
    
    const scrollResult = await scrollToLoadAll(page, {
      elementSelector: 'a.table-row',
      maxScrolls: 100,
      itemName: 'songs'
    })

    log('Step 4/5: Extracting song elements...')
    
    const songRows = await page.locator('a.table-row').all()
    
    if (songRows.length === 0) {
      return { success: false, message: 'No liked songs found' }
    }
    
    success(`✓ Found ${songRows.length} liked songs`)

    log('Step 5/5: Extracting song details...')
    
    const songs = []
    let extracted = 0
    
    for (const row of songRows) {
      try {
        const titleElement = row.locator('div.cell-title span')
        const title = (await titleElement.textContent()).trim()
        
        const artistElement = row.locator('div.cell-artist a')
        const artist = (await artistElement.textContent()).trim()
        
        let album = null
        let url = null
        
        try {
          const albumElement = row.locator('div.cell-album a')
          album = (await albumElement.textContent()).trim()
        } catch (err) {
          // Album not available
        }
        
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
          songs.push(songCard)
          outputBuilder.addLikedSong(songCard.toJSON())
          
          extracted++
          
          if (extracted % 50 === 0) {
            log(`  Extracted ${extracted}/${songRows.length} songs...`)
          }
        }
        
      } catch (err) {
        error(`Failed to extract song: ${err.message}`)
      }
    }
    
    success(`✓ Extracted ${songs.length} songs`)

    return {
      success: true,
      message: 'Scrape likes completed successfully',
      songsCount: songs.length,
      songs: songs
    }

  } catch (err) {
    error('Scrape likes failed:', err.message)
    return {
      success: false,
      message: 'Scrape likes failed',
      error: err
    }
  }
}

module.exports = { scrapeLikesFlow }
