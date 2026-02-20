const { getSongPageFlow } = require('./youtubeGetSongPageFlow')
const { waitForElement, waitForTimeout } = require('../../actions/waits')
const { clickElement } = require('../../actions/clicks')
const { log, success, error } = require('../../utils/logger')

const SAVE_BUTTON_SELECTOR = 'button[aria-label="Save to playlist"]'

async function locateSaveButtonFlow(page, song) {
  try {
    log('Step 1/3: Getting song page...')
    const pageResult = await getSongPageFlow(page, song)
    if (!pageResult.success) {
      return { success: false, message: pageResult.message, error: pageResult.error }
    }
    success('✓ Song page loaded')

    log('Step 2/3: Locating Save button...')
    await waitForTimeout(1500)
    const saveResult = await waitForElement(page, SAVE_BUTTON_SELECTOR, {
      timeout: 10000,
      state: 'visible',
      first: true
    })
    if (!saveResult.success) {
      return { success: false, message: 'Save button not found', error: saveResult.error }
    }
    success('✓ Save button found')

    log('Step 3/3: Clicking Save button...')
    const saveButton = page.locator(SAVE_BUTTON_SELECTOR).first()
    await saveButton.click()
    await waitForTimeout(500)
    success('✓ Save button clicked')

    return {
      success: true,
      message: 'Save button located and clicked'
    }
  } catch (err) {
    error('Locate save button flow failed:', err.message)
    return {
      success: false,
      message: 'Locate save button flow failed',
      error: err
    }
  }
}

module.exports = { locateSaveButtonFlow }
