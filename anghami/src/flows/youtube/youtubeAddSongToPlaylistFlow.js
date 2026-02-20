const { locatePlaylistContainerFlow } = require('./youtubeLocatePlaylistContainerFlow')
const { waitForTimeout } = require('../../actions/waits')
const { log, success, error } = require('../../utils/logger')

const PLAYLIST_ITEM_SELECTOR = 'yt-list-item-view-model'
const PLAYLIST_TITLE_SELECTOR = '.yt-list-item-view-model__title'

async function addSongToPlaylistFlow(page, song, playlistName) {
  try {
    log('Step 1/5: Locating playlist container...')
    const containerResult = await locatePlaylistContainerFlow(page, song)
    if (!containerResult.success) {
      return { success: false, message: containerResult.message, error: containerResult.error }
    }
    success('✓ Playlist container located')

    log('Step 2/5: Finding matching playlist...')
    const playlistItems = containerResult.container.locator(PLAYLIST_ITEM_SELECTOR)
    const count = await playlistItems.count()
    let targetItem = null

    for (let i = 0; i < count; i++) {
      const item = playlistItems.nth(i)
      const ariaLabel = await item.getAttribute('aria-label')
      const titleEl = item.locator(PLAYLIST_TITLE_SELECTOR).first()
      let titleText = ''
      try {
        titleText = (await titleEl.textContent()) || ''
      } catch {
        // title element may not exist
      }

      const labelMatch = ariaLabel && ariaLabel.toLowerCase().startsWith(playlistName.toLowerCase().trim())
      const titleMatch = titleText.trim().toLowerCase() === playlistName.trim().toLowerCase()

      if (labelMatch || titleMatch) {
        targetItem = item
        break
      }
    }

    if (!targetItem) {
      return { success: false, message: `Playlist "${playlistName}" not found` }
    }
    success(`✓ Found playlist: ${playlistName}`)

    log('Step 3/5: Checking if already in playlist...')
    const ariaPressed = await targetItem.getAttribute('aria-pressed')
    const alreadyInPlaylist = ariaPressed === 'true'

    if (alreadyInPlaylist) {
      success('✓ Already in playlist, skipping')
      await page.keyboard.press('Escape')
      await waitForTimeout(300)
      return {
        success: true,
        message: 'Already in playlist',
        alreadyInPlaylist: true
      }
    }

    log('Step 4/5: Clicking playlist to add song...')
    const clickableButton = targetItem.locator('button.yt-list-item-view-model__button-or-anchor, button.ytButtonOrAnchorButton').first()
    await clickableButton.click()
    await waitForTimeout(500)
    success('✓ Song added to playlist')

    log('Step 5/5: Closing modal (Escape)...')
    await page.keyboard.press('Escape')
    await waitForTimeout(300)
    success('✓ Modal closed')

    return {
      success: true,
      message: 'Song added to playlist',
      alreadyInPlaylist: false
    }
  } catch (err) {
    error('Add song to playlist flow failed:', err.message)
    return {
      success: false,
      message: 'Add song to playlist flow failed',
      error: err
    }
  }
}

module.exports = { addSongToPlaylistFlow }
