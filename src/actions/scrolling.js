const { log, success } = require('../utils/logger')

async function scrollToLoadAll(page, options = {}) {
  const {
    elementSelector,
    maxScrolls = 100,
    scrollDelay = 2000,
    itemName = 'items',
    containerSelector = null
  } = options

  if (!elementSelector) {
    throw new Error('elementSelector is required')
  }

  let previousCount = 0
  let currentCount = 0
  let scrollAttempts = 0

  let scrollContainer
  if (containerSelector) {
    scrollContainer = page.locator(containerSelector)
  } else {
    const scrollWindow = page.locator('#scroll_window')
    const baseContent = page.locator('#base_content')
    const useScrollWindow = await scrollWindow.count() > 0
    scrollContainer = useScrollWindow ? scrollWindow : baseContent
    log(`  Using scroll container: ${useScrollWindow ? '#scroll_window' : '#base_content'}`)
  }

  while (scrollAttempts < maxScrolls) {
    currentCount = await page.locator(elementSelector).count()

    if (currentCount === previousCount && scrollAttempts > 0) {
      success(`✓ All ${itemName} loaded (${currentCount} ${itemName})`)
      break
    }

    if (scrollAttempts > 0) {
      log(`  Loaded ${currentCount} ${itemName}... scrolling for more`)
    }

    await scrollContainer.evaluate(el => {
      el.scrollTo(0, el.scrollHeight)
    })

    try {
      const lastElement = page.locator(elementSelector).last()
      await lastElement.scrollIntoViewIfNeeded()
    } catch (err) {
      // Continue anyway
    }

    await page.waitForTimeout(scrollDelay)

    previousCount = currentCount
    scrollAttempts++
  }

  if (scrollAttempts >= maxScrolls) {
    log(`⚠ Warning: Reached max scroll limit (${maxScrolls})`)
  }

  success(`✓ Scrolling complete - found ${currentCount} ${itemName}`)

  return {
    success: true,
    finalCount: currentCount,
    message: `Loaded ${currentCount} ${itemName}`
  }
}

module.exports = { scrollToLoadAll }
