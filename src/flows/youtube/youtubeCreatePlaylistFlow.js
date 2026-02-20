const { locatePlaylistContainerFlow } = require('./youtubeLocatePlaylistContainerFlow')
const { waitForElement, waitForTimeout } = require('../../actions/waits')
const { log, success, error } = require('../../utils/logger')

const NEW_PLAYLIST_BTN_SELECTOR = 'button[aria-label="Create new playlist"]'
const NEW_PLAYLIST_DIALOG_SELECTOR = 'tp-yt-paper-dialog:has-text("New playlist")'
const TITLE_INPUT_SELECTOR = 'textarea[placeholder="Choose a title"]'
const CREATE_BTN_SELECTOR = 'button[aria-label="Create"]'

async function createPlaylistFlow(page, song, playlistName) {
  try {
    if (!playlistName || !String(playlistName).trim()) {
      return { success: false, message: 'Playlist name is required', playlistName, error: new Error('Empty playlist name') }
    }

    log('Step 1/5: Locating playlist container (opens Save modal)...')
    const containerResult = await locatePlaylistContainerFlow(page, song)
    if (!containerResult.success) {
      return { success: false, message: containerResult.message, playlistName, error: containerResult.error }
    }
    success('✓ Save modal open')

    log('Step 2/5: Clicking New playlist button...')
    const newPlaylistBtn = page.locator(NEW_PLAYLIST_BTN_SELECTOR).first()
    await newPlaylistBtn.waitFor({ state: 'visible', timeout: 10000 })
    await newPlaylistBtn.click()
    await waitForTimeout(500)
    success('✓ New playlist clicked')

    log('Step 3/5: Waiting for New playlist dialog...')
    const dialogResult = await waitForElement(page, NEW_PLAYLIST_DIALOG_SELECTOR, {
      timeout: 15000,
      state: 'visible',
      first: true
    })
    if (!dialogResult.success) {
      return { success: false, message: 'New playlist dialog did not open', playlistName, error: dialogResult.error }
    }
    success('✓ Dialog visible')

    const dialog = page.locator(NEW_PLAYLIST_DIALOG_SELECTOR).first()

    log('Step 4/5: Filling playlist title...')
    const titleInput = dialog.locator(TITLE_INPUT_SELECTOR).first()
    await titleInput.waitFor({ state: 'visible', timeout: 5000 })
    await titleInput.fill(playlistName.trim())
    await waitForTimeout(300)
    success(`✓ Title filled: ${playlistName}`)

    log('Step 5/5: Clicking Create button...')
    const createBtn = dialog.locator(CREATE_BTN_SELECTOR).first()
    await createBtn.waitFor({ state: 'visible', timeout: 5000 })
    const ariaDisabled = await createBtn.getAttribute('aria-disabled')
    if (ariaDisabled === 'true') {
      await waitForTimeout(500)
    }
    const isDisabled = await createBtn.getAttribute('aria-disabled')
    if (isDisabled === 'true') {
      return { success: false, message: 'Create button stayed disabled after filling title', playlistName }
    }
    await createBtn.click()
    await waitForTimeout(500)
    success('✓ Playlist created')

    return {
      success: true,
      playlistName: playlistName.trim(),
      message: 'Playlist created successfully'
    }
  } catch (err) {
    error('Create playlist flow failed:', err.message)
    return {
      success: false,
      message: 'Create playlist flow failed',
      playlistName,
      error: err
    }
  }
}

module.exports = { createPlaylistFlow }
