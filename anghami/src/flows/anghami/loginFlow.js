const { goTo } = require('../actions/navigation')
const { clickElement } = require('../actions/clicks')
const { waitForElement, waitForText } = require('../actions/waits')
const { saveSession } = require('../../browser/sessionManager')
const config = require('../../../config/config')
const { log, success, error } = require('../../utils/logger')

async function executeLoginFlow(page) {
  try {
    log('Step 1/7: Navigating to Anghami homepage...')
    const navResult = await goTo(page, config.urls.base)
    if (!navResult.success) {
      return { success: false, message: 'Failed to navigate to homepage', error: navResult.error }
    }
    success('✓ Homepage loaded')

    log('Step 2/7: Clicking login button...')
    const loginButtonResult = await clickElement(page, '#header_login_button')
    if (!loginButtonResult.success) {
      return { success: false, message: 'Failed to click login button', error: loginButtonResult.error }
    }
    success('✓ Login button clicked')

    log('Step 3/7: Waiting for login popup...')
    const popupResult = await waitForElement(page, '#login_popup', {
      timeout: 10000,
      state: 'visible'
    })
    if (!popupResult.success) {
      return { success: false, message: 'Login popup did not appear', error: popupResult.error }
    }
    success('✓ Login popup appeared')

    log('Step 4/7: Clicking "Scan QR code" button...')
    const qrButtonResult = await clickElement(page, '.styles_QRLogin-btn__MHRfa')
    if (!qrButtonResult.success) {
      return { success: false, message: 'Failed to click QR code button', error: qrButtonResult.error }
    }
    success('✓ QR code displayed')

    log('Step 5/7: Waiting for login completion...')
    log('⏳ Please scan the QR code with your Anghami mobile app...')
    const logoutResult = await waitForText(page, 'Logout', {
      timeout: 120000
    })
    if (!logoutResult.success) {
      return { success: false, message: 'Login timeout - QR code not scanned', error: logoutResult.error }
    }
    success('✓ Login successful!')

    log('Step 6/7: Saving session cookies...')
    const sessionResult = await saveSession(page.context(), config.paths.cookies)
    if (!sessionResult.success) {
      error('⚠ Warning: Failed to save session, will need to login again next time')
    } else {
      success('✓ Session saved')
    }

    log('Step 7/7: Verifying login state...')
    const verifyResult = await waitForElement(page, 'text=Logout', {
      timeout: 5000
    })
    if (!verifyResult.success) {
      return { success: false, message: 'Login verification failed', error: verifyResult.error }
    }
    success('✓ Login verified')

    return {
      success: true,
      message: 'Login flow completed successfully'
    }

  } catch (err) {
    error('Login flow failed:', err.message)
    return {
      success: false,
      message: 'Login flow failed with exception',
      error: err
    }
  }
}

module.exports = { executeLoginFlow }
