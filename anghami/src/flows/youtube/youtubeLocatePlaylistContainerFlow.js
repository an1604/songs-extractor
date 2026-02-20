const { locateSaveButtonFlow } = require('./youtubeLocateSaveButtonFlow')
const { waitForElement, waitForTimeout } = require('../../actions/waits')
const { log, success, error } = require('../../utils/logger')

// Save modal: dropdown with "Save video to..." header (unique on page)
const SAVE_MODAL_SELECTOR = 'tp-yt-iron-dropdown:has(yt-panel-header-view-model[aria-label="Save video to..."])'
const PLAYLISTS_LIST_SELECTOR = 'yt-list-view-model'

async function locatePlaylistContainerFlow(page, song) {
  try {
    log('Step 1/3: Locating Save button (opens modal)...')
    const saveResult = await locateSaveButtonFlow(page, song)
    if (!saveResult.success) {
      return { success: false, message: saveResult.message, error: saveResult.error }
    }
    success('✓ Modal opening')

    log('Step 2/3: Waiting for modal...')
    await waitForTimeout(800)
    const modalResult = await waitForElement(page, SAVE_MODAL_SELECTOR, {
      timeout: 15000,
      state: 'visible',
      first: true
    })
    if (!modalResult.success) {
      return { success: false, message: 'Playlist modal did not open', error: modalResult.error }
    }
    success('✓ Modal visible')

    log('Step 3/3: Locating playlists list...')
    const listResult = await waitForElement(page, `${SAVE_MODAL_SELECTOR} ${PLAYLISTS_LIST_SELECTOR}`, {
      timeout: 15000,
      state: 'visible',
      first: true
    })
    if (!listResult.success) {
      return { success: false, message: 'Playlists list not found', error: listResult.error }
    }
    success('✓ Playlists list located')

    const container = page.locator(SAVE_MODAL_SELECTOR).locator(PLAYLISTS_LIST_SELECTOR)
    return {
      success: true,
      container,
      message: 'Playlist container located'
    }
  } catch (err) {
    error('Locate playlist container flow failed:', err.message)
    return {
      success: false,
      message: 'Locate playlist container flow failed',
      error: err
    }
  }
}

module.exports = { locatePlaylistContainerFlow }
