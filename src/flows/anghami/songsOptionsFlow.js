const { waitForElement } = require('../actions/waits')
const { log, success, error } = require('../../utils/logger')

async function extractSongsOptions(page) {
  try {
    log('Step 1/3: Waiting for library menu to load...')
    
    await waitForElement(page, 'div.menu-tab-items', {
      state: 'visible',
      timeout: 10000
    })
    
    success('✓ Library menu loaded')

    log('Step 2/3: Extracting song categories...')
    
    const menuItems = await page.locator('div.menu-tab-item').all()
    
    if (menuItems.length === 0) {
      return { success: false, message: 'No menu items found' }
    }
    
    success(`✓ Found ${menuItems.length} categories`)

    log('Step 3/3: Extracting category details...')
    
    const categories = []
    
    for (const item of menuItems) {
      // Extract text (category name)
      const textContent = await item.locator('div.text-container').textContent()
      const name = textContent.trim()
      
      // Extract icon class
      const iconElement = item.locator('div.icon')
      const iconClass = await iconElement.getAttribute('class')
      const icon = iconClass.match(/library-(\w+)/)?.[1] || 'unknown'
      
      // Check if selected
      const itemClass = await item.getAttribute('class')
      const selected = itemClass.includes('selected')
      
      categories.push({ name, icon, selected })
    }
    
    success(`✓ Extracted ${categories.length} categories: ${categories.map(c => c.name).join(', ')}`)

    return {
      success: true,
      message: 'Songs options extracted successfully',
      categories: categories
    }

  } catch (err) {
    error('Extract songs options failed:', err.message)
    return {
      success: false,
      message: 'Extract songs options failed',
      error: err
    }
  }
}

module.exports = { extractSongsOptions }
