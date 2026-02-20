const { clickElement } = require('../actions/clicks')
const { waitForElement, waitForNavigation } = require('../actions/waits')
const { waitForNewPage } = require('../actions/tabs')
const { log, success, error } = require('../../utils/logger')

async function executeNavigateToHomeFlow(context, currentPage) {
  try {
    log('Step 1/4: Clicking "Start Playing" button...')
    
    // Try to wait for new page, but handle case where it navigates in same tab
    let homePage = null
    let isNewTab = false
    
    try {
      // Race between new page opening or same page navigating
      const newPagePromise = waitForNewPage(context, { timeout: 3000 })
      const clickPromise = clickElement(currentPage, 'a.hamburger_get_app__Nktzh')
        .catch(() => clickElement(currentPage, 'button.styles_button__tqz7W'))
      
      await clickPromise
      
      // Try to get new page with short timeout
      homePage = await newPagePromise.catch(() => null)
      
      if (homePage) {
        isNewTab = true
        success('✓ New tab opened')
      } else {
        // No new tab, navigation happened in current page
        homePage = currentPage
        isNewTab = false
        success('✓ Navigating in current tab')
      }
      
    } catch (err) {
      // If click fails, return error
      return { success: false, message: 'Failed to click Start Playing button', error: err }
    }

    log('Step 2/4: Verifying home page URL...')
    
    const currentUrl = homePage.url()
    
    // If not at home page yet, wait for navigation
    if (!currentUrl.includes('play.anghami.com/home')) {
      await waitForNavigation(homePage)
    }
    
    const finalUrl = homePage.url()
    if (!finalUrl.includes('play.anghami.com/home')) {
      return { 
        success: false, 
        message: `Wrong page loaded: ${finalUrl}` 
      }
    }
    
    success(`✓ Home page URL verified: ${finalUrl}`)

    log('Step 3/4: Verifying home page is ready...')
    
    await waitForElement(homePage, 'a[href="/mymusic"]', { 
      state: 'visible',
      timeout: 10000 
    })
    
    success('✓ Home page verified - Navigation loaded')

    log('Step 4/4: Clicking "Your Library" to navigate to library...')
    
    const libraryClickResult = await clickElement(homePage, 'a[href="/mymusic"]')
    if (!libraryClickResult.success) {
      return { success: false, message: 'Failed to click Your Library', error: libraryClickResult.error }
    }
    
    success('✓ "Your Library" clicked')

    // Wait for URL to contain /mymusic (with timeout)
    try {
      await homePage.waitForURL('**/mymusic**', { timeout: 10000 })
    } catch (err) {
      // If timeout, check if we're already there
      const libraryUrl = homePage.url()
      if (!libraryUrl.includes('/mymusic')) {
        return { 
          success: false, 
          message: `Library page not loaded: ${libraryUrl}` 
        }
      }
    }
    
    const libraryUrl = homePage.url()
    success(`✓ Library page loaded: ${libraryUrl}`)

    return {
      success: true,
      message: 'Navigate to home page and library completed successfully',
      homePage: homePage,
      loginPage: isNewTab ? currentPage : null,
      isNewTab: isNewTab
    }

  } catch (err) {
    error('Navigate to home flow failed:', err.message)
    return {
      success: false,
      message: 'Navigate to home flow failed',
      error: err
    }
  }
}

module.exports = { executeNavigateToHomeFlow }
