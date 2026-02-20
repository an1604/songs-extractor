# Songs Options Flow Implementation

## 📋 Flow Definition Reference

**Source**: `anghami/flows/songsOptions.txt`

**Purpose**: Extract all available song category options from the library menu

**Steps**:
1. Once "Navigate to the home page" stage done (at `/mymusic`)
2. Locate the songs container (`div.menu-tab-items`)
3. Extract all menu items with their names
4. Return structured list: "Likes", "Downloads", "Recently Played", "Created For You", "Playlists", "Albums", "Artists"

---

## 🎯 Objective

Extract all available song category options from the library menu to:
- Discover what categories the user has
- Enable dynamic scraping based on available options
- Allow user selection of categories to scrape

---

## 🏗️ Implementation Architecture

### **File**: `src/flows/songsOptionsFlow.js`

### **Dependencies**:
```javascript
const { waitForElement } = require('../actions/waits')
const { log, success, error } = require('../utils/logger')
```

### **Function Signature**:
```javascript
async function extractSongsOptions(page)
```

**Parameters**:
- `page` - Playwright page object (must be at library page `/mymusic`)

**Returns**:
```javascript
{
  success: true/false,
  message: string,
  categories: [
    { name: 'Likes', icon: 'likes', selected: true },
    { name: 'Downloads', icon: 'downloads', selected: false },
    { name: 'Recently Played', icon: 'recently', selected: false },
    { name: 'Created For You', icon: 'foryou', selected: false },
    { name: 'Playlists', icon: 'playlists', selected: false },
    { name: 'Albums', icon: 'albums', selected: false },
    { name: 'Artists', icon: 'artists', selected: false }
  ],
  error?: Error
}
```

---

## 📝 Step-by-Step Implementation

### **Step 1: Wait for Container to Load**

**Action**: `waitForElement(page, selector)`

**Selector**: `div.menu-tab-items`

**Implementation**:
```javascript
log('Step 1/3: Waiting for library menu to load...')

await waitForElement(page, 'div.menu-tab-items', {
  state: 'visible',
  timeout: 10000
})

success('✓ Library menu loaded')
```

**What happens**:
- Wait for the menu container to be visible
- Ensures Angular has rendered the menu items
- 10-second timeout for slow networks

**Expected result**: Menu container is visible with all category items

**Menu Container Structure**:
```html
<div class="menu-tab-items ng-star-inserted">
  <!-- Multiple menu-tab-item elements inside -->
</div>
```

---

### **Step 2: Extract All Menu Items**

**Action**: Get all menu item elements using Playwright locator

**Selector**: `div.menu-tab-item`

**Implementation**:
```javascript
log('Step 2/3: Extracting song categories...')

const menuItems = await page.locator('div.menu-tab-item').all()

if (menuItems.length === 0) {
  return { success: false, message: 'No menu items found' }
}

success(`✓ Found ${menuItems.length} categories`)
```

**What happens**:
- Get all menu item elements (typically 7 items)
- Verify at least one item exists
- Count total categories found

**Expected result**: Array of 7 menu item locator objects

**Menu Item Structure**:
```html
<div class="menu-tab-item selected ng-star-inserted" tabindex="0">
  <div class="icon-container">
    <div class="icon library-likes"></div>
  </div>
  <div class="text-container">Likes</div>
  <div class="arrow-container">...</div>
</div>
```

---

### **Step 3: Extract Details from Each Item**

**Action**: Loop through items and extract name, icon class, and selected state

**Data to Extract**:
1. **Category Name**: From `div.text-container` text content
2. **Icon Type**: From `div.icon` class attribute (e.g., `library-likes`)
3. **Selection State**: From parent `div.menu-tab-item` class (has `selected` class or not)

**Implementation**:
```javascript
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
```

**What happens**:
- Loop through each menu item element
- Extract category name from text container (trim whitespace)
- Extract icon type from icon class using regex (`library-likes` → `likes`)
- Check if item has `selected` class (indicates currently active category)
- Build structured object for each category

**Expected result**: Array of category objects with complete metadata

**Example Category Object**:
```javascript
{
  name: 'Likes',
  icon: 'likes',
  selected: true
}
```

---

## 📄 Complete Implementation Code

```javascript
// src/flows/songsOptionsFlow.js
const { waitForElement } = require('../actions/waits')
const { log, success, error } = require('../utils/logger')

async function extractSongsOptions(page) {
  try {
    // Step 1: Wait for library menu to load
    log('Step 1/3: Waiting for library menu to load...')
    
    await waitForElement(page, 'div.menu-tab-items', {
      state: 'visible',
      timeout: 10000
    })
    
    success('✓ Library menu loaded')

    // Step 2: Get all menu items
    log('Step 2/3: Extracting song categories...')
    
    const menuItems = await page.locator('div.menu-tab-item').all()
    
    if (menuItems.length === 0) {
      return { success: false, message: 'No menu items found' }
    }
    
    success(`✓ Found ${menuItems.length} categories`)

    // Step 3: Extract details from each item
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
```

---

## 🎯 Action Block Usage Summary

| Step | Action Block | Module | Existing? |
|------|-------------|--------|-----------|
| 1 | `waitForElement()` | `waits.js` | ✅ Yes |
| 2 | Playwright `.locator().all()` | Built-in | ✅ Yes |
| 3 | Playwright `.textContent()`, `.getAttribute()` | Built-in | ✅ Yes |

**Note**: No new action blocks needed - uses existing actions and Playwright built-in methods

---

## 🔍 Element Structure Analysis

### **Container Element**
```html
<div class="menu-tab-items ng-star-inserted">
  <!-- 7 menu items inside -->
</div>
```

**Selector**: `div.menu-tab-items`
- ✅ Stable class name
- ✅ Contains all menu items
- ✅ Not Angular-specific (safe)

---

### **Menu Item Element**
```html
<div class="menu-tab-item selected ng-star-inserted" tabindex="0">
  <div class="icon-container">
    <div class="icon library-likes"></div>
  </div>
  <div class="text-container">Likes</div>
  <div class="arrow-container">
    <anghami-icon>
      <svg role="img" title="arrow-left">...</svg>
    </anghami-icon>
  </div>
</div>
```

**Key Classes**:
- `menu-tab-item` - Individual category item
- `selected` - Currently active category
- `icon library-{type}` - Icon identifier (likes, downloads, etc.)
- `text-container` - Category display name

**Why These Selectors?**:
- ✅ Simple, semantic classes
- ✅ Not dependent on Angular attributes
- ✅ Stable across updates
- ✅ Clear purpose

---

## 🔄 Integration with Main Flow

### **Updated `src/index.js`**:

```javascript
const { executeNavigateToHomeFlow } = require('./flows/navigateToHomeFlow')
const { extractSongsOptions } = require('./flows/songsOptionsFlow')

async function main() {
  // ... (browser setup, login, navigate to home)
  
  const navResult = await executeNavigateToHomeFlow(context, page)
  homePage = navResult.homePage

  // === EXTRACT SONG CATEGORIES ===
  log('=== Extracting Available Song Categories ===')
  const optionsResult = await extractSongsOptions(homePage)

  if (optionsResult.success) {
    success('Song categories extracted:', optionsResult.message)
    log(`Available categories: ${optionsResult.categories.length}`)
    
    // Display categories
    optionsResult.categories.forEach(cat => {
      const indicator = cat.selected ? '✓' : '○'
      log(`  ${indicator} ${cat.name} (${cat.icon})`)
    })
    
    // Store for future use
    const availableCategories = optionsResult.categories
    
  } else {
    error('Failed to extract categories:', optionsResult.message)
    return
  }

  // === FUTURE: SCRAPE EACH CATEGORY ===
  // for (const category of availableCategories) {
  //   log(`Scraping ${category.name}...`)
  //   await scrapeCategoryFlow(homePage, category.name)
  // }
}
```

---

## 📊 Expected Output

### **Console Output**:
```
[INFO] === Extracting Available Song Categories ===
[INFO] Step 1/3: Waiting for library menu to load...
[SUCCESS] ✓ Library menu loaded
[INFO] Step 2/3: Extracting song categories...
[SUCCESS] ✓ Found 7 categories
[INFO] Step 3/3: Extracting category details...
[SUCCESS] ✓ Extracted 7 categories: Likes, Downloads, Recently Played, Created For You, Playlists, Albums, Artists
[SUCCESS] Song categories extracted: Songs options extracted successfully
[INFO] Available categories: 7
[INFO]   ✓ Likes (likes)
[INFO]   ○ Downloads (downloads)
[INFO]   ○ Recently Played (recently)
[INFO]   ○ Created For You (foryou)
[INFO]   ○ Playlists (playlists)
[INFO]   ○ Albums (albums)
[INFO]   ○ Artists (artists)
```

### **Return Data**:
```javascript
{
  success: true,
  message: 'Songs options extracted successfully',
  categories: [
    { name: 'Likes', icon: 'likes', selected: true },
    { name: 'Downloads', icon: 'downloads', selected: false },
    { name: 'Recently Played', icon: 'recently', selected: false },
    { name: 'Created For You', icon: 'foryou', selected: false },
    { name: 'Playlists', icon: 'playlists', selected: false },
    { name: 'Albums', icon: 'albums', selected: false },
    { name: 'Artists', icon: 'artists', selected: false }
  ]
}
```

---

## ✅ Use Cases

### **1. Discover Available Options**
```javascript
const options = await extractSongsOptions(page)
console.log(`User has ${options.categories.length} categories`)
```

**Benefit**: Know what data is available before scraping

---

### **2. Dynamic Category Selection**
```javascript
const categories = optionsResult.categories
const categoriesToScrape = categories.filter(c => 
  ['Likes', 'Playlists', 'Albums'].includes(c.name)
)

for (const cat of categoriesToScrape) {
  await scrapeCategory(page, cat.name)
}
```

**Benefit**: Flexible scraping based on user needs

---

### **3. User Preference**
```javascript
// Let user choose which categories to scrape
const userChoice = await askUser('Which categories to scrape?', 
  categories.map(c => c.name)
)

const selectedCategories = categories.filter(c => 
  userChoice.includes(c.name)
)
```

**Benefit**: User control over what gets scraped

---

### **4. Validation**
```javascript
if (!categories.find(c => c.name === 'Likes')) {
  log('Warning: Likes category not available')
}
```

**Benefit**: Handle missing or disabled categories gracefully

---

## 🚀 Future Enhancement: Click Categories

After extracting options, you can click each category to navigate:

```javascript
// Click a specific category
async function selectCategory(page, categoryName) {
  const selector = `div.menu-tab-item:has-text("${categoryName}")`
  await clickElement(page, selector)
  await waitForNavigation(page)
}

// Example: Click "Playlists"
await selectCategory(homePage, 'Playlists')
```

This enables:
1. Navigate to each category
2. Scrape songs from that view
3. Move to next category
4. Repeat

---

## ⚠️ Error Handling

### **Possible Failures**

| Failure | Cause | Solution |
|---------|-------|----------|
| Container not found | Wrong page or not loaded | Verify at `/mymusic` page |
| No menu items | Page structure changed | Update selectors |
| Zero categories | Angular not rendered | Increase timeout |
| Text extraction fails | DOM structure changed | Check text-container class |

### **Error Messages**

All errors return:
```javascript
{
  success: false,
  message: 'Human-readable error message',
  error: Error object with stack trace
}
```

---

## 🧪 Testing Checklist

- [ ] Library page loads (`/mymusic`)
- [ ] Menu container is visible
- [ ] All 7 categories are found
- [ ] Category names are extracted correctly
- [ ] Icon types are extracted correctly
- [ ] Selected state is detected correctly
- [ ] Returns structured data
- [ ] Handles errors gracefully

---

## 📚 Category Details

### **Expected Categories** (as of 2026-02-20):

| Name | Icon Class | Typical Selection | Purpose |
|------|-----------|-------------------|---------|
| Likes | `library-likes` | ✓ Default | User's liked songs |
| Downloads | `library-downloads` | ○ | Downloaded songs (offline) |
| Recently Played | `library-recently` | ○ | Recent listening history |
| Created For You | `library-foryou` | ○ | Personalized playlists |
| Playlists | `library-playlists` | ○ | User-created playlists |
| Albums | `library-albums` | ○ | Saved albums |
| Artists | `library-artists` | ○ | Followed artists |

**Note**: "Likes" is typically selected by default when navigating to library

---

## 🎯 Design Principles

### **1. Pure Extraction**
- No clicks or navigation
- Just reads existing DOM
- Fast and safe

### **2. Structured Data**
- Returns clear object structure
- Includes all useful metadata
- Easy to consume

### **3. No Dependencies**
- Uses only existing actions
- No new files needed
- Minimal implementation

### **4. Future-Proof**
- Flexible for category changes
- Works if new categories added
- Handles missing categories

---

## 📚 Related Documentation

- `ARCHITECTURE_PLAN.md` - Complete system architecture
- `LOGIN_FLOW_IMPLEMENTATION.md` - Login flow details
- `NAVIGATE_TO_HOME_FLOW_IMPLEMENTATION.md` - Home page navigation

---

**Status**: Ready for implementation  
**Dependencies**: None (uses existing actions)  
**Estimated Implementation Time**: 15 minutes  
**Complexity**: Low (pure data extraction)
