const { goTo } = require('../../actions/navigation')
const { waitForElement } = require('../../actions/waits')
const config = require('../../../config/config')
const { log, success, error } = require('../../utils/logger')

async function searchSongFlow(page, searchQuery) {
  try {
    log(`Searching for: ${searchQuery}`)
    log('Step 1/2: Navigating to search results URL...')
    const searchUrl = config.urls.youtube.search + encodeURIComponent(searchQuery)
    const navResult = await goTo(page, searchUrl)
    if (!navResult.success) {
      return { success: false, message: 'Failed to navigate to search results', error: navResult.error }
    }
    success(`✓ Navigated to: ${page.url()}`)

    log('Step 2/2: Validating results loaded...')
    const resultsResult = await waitForElement(page, 'yt-chip-cloud-chip-renderer, #contents, ytd-video-renderer', {
      timeout: 10000,
      state: 'visible',
      first: true
    })
    if (!resultsResult.success) {
      return { success: false, message: 'Search results did not load', error: resultsResult.error }
    }
    success('✓ Search results loaded')

    return {
      success: true,
      message: 'Search completed successfully'
    }
  } catch (err) {
    error('Search song flow failed:', err.message)
    return {
      success: false,
      message: 'Search song flow failed',
      error: err
    }
  }
}

module.exports = { searchSongFlow }
