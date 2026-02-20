const { goTo } = require('../../actions/navigation')
const { clickElement } = require('../../actions/clicks')
const { waitForElement } = require('../../actions/waits')
const { saveYouTubeSession } = require('../../browser/sessionManager')
const config = require('../../../config/config')
const { log, success, error } = require('../../utils/logger')

async function executeYouTubeLoginFlow(page, context) {
  try {
    log('Step 1/3: Navigating to YouTube...')
    const navResult = await goTo(page, config.urls.youtube.base)
    if (!navResult.success) {
      return { success: false, message: 'Failed to navigate to YouTube', error: navResult.error }
    }
    success('✓ YouTube loaded')

    log('Step 2/3: Clicking Sign In button...')
    const signInSelectors = [
      'a[href*="accounts.google.com"]',
      'ytd-button-renderer a[href*="accounts.google.com"]',
      'button:has-text("Sign in")',
      '#sign-in-button'
    ]
    let clickResult = { success: false }
    for (const selector of signInSelectors) {
      clickResult = await clickElement(page, selector)
      if (clickResult.success) break
    }
    if (!clickResult.success) {
      return { success: false, message: 'Failed to click Sign In button', error: clickResult.error }
    }
    success('✓ Sign In clicked')
    log('⏳ Complete sign-in in the browser window...')

    log('Step 3/3: Waiting for login completion...')
    const loginTimeout = 120000
    const pollInterval = 2000
    const startTime = Date.now()
    let avatarResult = { success: false }

    while (Date.now() - startTime < loginTimeout) {
      const currentUrl = page.url()
      if (currentUrl.includes('support.google.com')) {
        log('  Detected support.google.com - navigating back to YouTube...')
        const backResult = await goTo(page, config.urls.youtube.base)
        if (!backResult.success) {
          return { success: false, message: 'Failed to navigate back to YouTube', error: backResult.error }
        }
        success('✓ Returned to YouTube')
        await page.waitForTimeout(2000)
      }

      avatarResult = await waitForElement(page, '#avatar-btn', {
        timeout: pollInterval,
        state: 'visible'
      })
      if (avatarResult.success) break

      await page.waitForTimeout(500)
    }

    if (!avatarResult.success) {
      return {
        success: false,
        message: 'Login timeout - avatar button did not appear',
        error: avatarResult.error
      }
    }
    success('✓ Logged in - avatar button visible')

    log('Saving YouTube session cookies...')
    const sessionResult = await saveYouTubeSession(context, config.paths.youtubeCookies)
    if (!sessionResult.success) {
      error('⚠ Warning: Failed to save YouTube session, will need to login again next time')
    } else {
      success('✓ YouTube session saved')
    }

    return {
      success: true,
      message: 'YouTube login flow completed successfully'
    }
  } catch (err) {
    error('YouTube login flow failed:', err.message)
    return {
      success: false,
      message: 'YouTube login flow failed',
      error: err
    }
  }
}

module.exports = { executeYouTubeLoginFlow }
