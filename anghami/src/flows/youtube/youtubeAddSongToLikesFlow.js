const { getSongPageFlow } = require('./youtubeGetSongPageFlow')
const { waitForElement, waitForTimeout } = require('../../actions/waits')
const { log, success, error } = require('../../utils/logger')

// YouTube like button: aria-label="like this video along with N other people" (exact from user's DOM)
// Scoped to #top-level-buttons-computed to avoid matching other elements
const LIKE_BUTTON_SELECTOR = '#top-level-buttons-computed button[aria-label^="like this video"], #top-level-buttons-computed button[aria-label^="Unlike this video"], button[aria-label^="like this video"], button[aria-label^="Unlike this video"]'

async function addSongToLikesFlow(page, song) {
  try {
    log('Step 1/4: Getting song page...')
    const pageResult = await getSongPageFlow(page, song)
    if (!pageResult.success) {
      return { success: false, message: pageResult.message, error: pageResult.error }
    }
    success('✓ Song page loaded')

    log('Step 2/4: Locating like button...')
    await waitForTimeout(1500)
    let likeButton = page.locator(LIKE_BUTTON_SELECTOR).first()
    try {
      await likeButton.waitFor({ state: 'visible', timeout: 15000 })
    } catch (err) {
      likeButton = page.getByRole('button', { name: /^like this video|^unlike this video/i }).first()
      await likeButton.waitFor({ state: 'visible', timeout: 5000 })
    }
    success('✓ Like button found')

    log('Step 3/4: Checking if already liked...')
    const ariaPressed = await likeButton.getAttribute('aria-pressed')
    const alreadyLiked = ariaPressed === 'true'

    if (alreadyLiked) {
      success('✓ Already liked, skipping')
      return {
        success: true,
        message: 'Already liked',
        alreadyLiked: true
      }
    }

    log('Step 4/4: Clicking like button...')
    await likeButton.click()
    await waitForTimeout(1000)
    success('✓ Song added to likes')

    return {
      success: true,
      message: 'Song added to likes',
      alreadyLiked: false
    }
  } catch (err) {
    error('Add song to likes flow failed:', err.message)
    return {
      success: false,
      message: 'Add song to likes flow failed',
      error: err
    }
  }
}

module.exports = { addSongToLikesFlow }
