const { searchSongFlow } = require('./youtubeSearchSongFlow')
const { getSongContainerFlow } = require('./youtubeGetSongContainerFlow')
const { goTo } = require('../../actions/navigation')
const { waitForElement, waitForTimeout } = require('../../actions/waits')
const config = require('../../../config/config')
const { log, success, error } = require('../../utils/logger')

async function getSongPageFlow(page, song) {
  try {
    log('Step 1/4: Searching for song...')
    const searchQuery = `${song.title} ${song.artist}`
    const searchResult = await searchSongFlow(page, searchQuery)
    if (!searchResult.success) {
      return { success: false, message: `Search failed for "${song.title}"`, error: searchResult.error }
    }
    success('✓ Search completed')

    log('Step 2/4: Getting song container...')
    const containerResult = await getSongContainerFlow(page)
    if (!containerResult.success) {
      return { success: false, message: `No results for "${song.title}"`, error: containerResult.error }
    }
    success('✓ Container located')

    log('Step 3/4: Navigating to first video...')
    const firstVideo = containerResult.container.locator('ytd-video-renderer').first()
    const videoLink = firstVideo.locator('a#video-title, a#thumbnail').first()
    const href = await videoLink.getAttribute('href')
    if (!href) {
      return { success: false, message: 'First video link not found' }
    }
    const watchUrl = href.startsWith('http') ? href : `${config.urls.youtube.base.replace(/\/$/, '')}${href}`
    const navResult = await goTo(page, watchUrl)
    if (!navResult.success) {
      return { success: false, message: 'Failed to navigate to watch page', error: navResult.error }
    }
    await waitForTimeout(1500)
    success('✓ Navigated to watch page')

    log('Step 4/4: Validating title...')
    const titleResult = await waitForElement(page, '#title h1, ytd-watch-metadata h1', {
      timeout: 10000,
      state: 'visible',
      first: true
    })
    if (!titleResult.success) {
      return { success: false, message: 'Watch page title not found', error: titleResult.error }
    }

    const titleElement = page.locator('#title h1, ytd-watch-metadata h1').first()
    const titleText = (await titleElement.textContent()) || ''
    const titleTextLower = titleText.toLowerCase()

    const mainTitle = song.title.split(/[(\[]/)[0].trim().toLowerCase()
    const artistLower = song.artist.toLowerCase()
    const titleMatch = mainTitle && titleTextLower.includes(mainTitle)
    const artistMatch = artistLower && titleTextLower.includes(artistLower)
    const fullTitleMatch = titleTextLower.includes(song.title.toLowerCase())

    if (!fullTitleMatch && !(titleMatch || artistMatch)) {
      return { success: false, message: `Title mismatch: expected "${song.title}" in "${titleText}"` }
    }
    success(`✓ Title matches: ${song.title}`)

    return {
      success: true,
      message: 'Song page loaded successfully'
    }
  } catch (err) {
    error('Get song page flow failed:', err.message)
    return {
      success: false,
      message: 'Get song page flow failed',
      error: err
    }
  }
}

module.exports = { getSongPageFlow }
