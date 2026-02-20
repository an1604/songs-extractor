const { waitForElement } = require('../../actions/waits')
const { log, success, error } = require('../../utils/logger')

async function getSongContainerFlow(page) {
  try {
    log('Step 1/2: Waiting for video results container...')
    const resultsResult = await waitForElement(page, 'ytd-item-section-renderer #contents, ytd-video-renderer', {
      timeout: 10000,
      state: 'visible',
      first: true
    })
    if (!resultsResult.success) {
      return { success: false, message: 'Video results container not found', error: resultsResult.error }
    }
    success('✓ Video results loaded')

    log('Step 2/2: Locating search results #contents div...')
    const contentsSelector = 'ytd-search ytd-two-column-search-results-renderer ytd-section-list-renderer ytd-item-section-renderer #contents'
    const contentsLocator = page.locator(contentsSelector).first()
    const contentsResult = await waitForElement(page, contentsSelector, {
      timeout: 10000,
      state: 'visible',
      first: true
    })
    if (!contentsResult.success) {
      return { success: false, message: 'Search results #contents div not found', error: contentsResult.error }
    }
    success('✓ Search results container located')

    return {
      success: true,
      message: 'Search results container located',
      container: contentsLocator
    }
  } catch (err) {
    error('Get song container flow failed:', err.message)
    return {
      success: false,
      message: 'Get song container flow failed',
      error: err
    }
  }
}

module.exports = { getSongContainerFlow }
