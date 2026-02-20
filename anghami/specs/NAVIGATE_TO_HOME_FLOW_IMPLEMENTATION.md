# Navigate to Home Page Flow Implementation

## 📋 Flow Definition Reference

**Source**: `anghami/flows/navigate_to_home_page.txt`

**Steps**:
1. Once the login flow done, locate the "Start playing" button and press it
   - Option 1: `<a href="https://www.anghami.com/home" class="hamburger_get_app__Nktzh">Start Playing</a>`
   - Option 2: `<button type="button" class="styles_button__tqz7W" style="background-color: rgb(0, 0, 0); color: rgb(255, 255, 255);">Start Playing</button>`
2. It will launch a new tab including the following path: `https://play.anghami.com/home?_branch_match_id=...`
   - Note: URL parameters may vary at runtime
3. This new tab contains the home page

---

## 🏗️ Implementation Architecture

### **File**: `src/flows/navigateToHomeFlow.js`

### **Dependencies**:
```javascript
const { clickElement } = require('../actions/clicks')
const { waitForElement, waitForNavigation } = require('../actions/waits')
const { waitForNewPage } = require('../actions/tabs')
const { log, success, error } = require('../utils/logger')
```

### **Function Signature**:
```javascript
async function executeNavigateToHomeFlow(context, currentPage)
```

**Parameters**:
- `context` - Playwright browser context (needed to detect new pages)
- `currentPage` - Current page object (the login page)

**Returns**:
```javascript
{
  success: true/false,
  message: string,
  homePage: Page,      // The new home page tab
  loginPage: Page,     // Original login page (still open)
  error?: Error
}
```

---

## 📝 Step-by-Step Implementation

### **Step 1: Click "Start Playing" Button and Detect Tab Behavior**

**Actions**: `clickElement(page, selector)` with fallback + `waitForNewPage(context)`

**Selector Strategy**:
- Primary: `a.hamburger_get_app__Nktzh` (link element)
- Fallback: `button.styles_button__tqz7W` (button element)

**Two Possible Scenarios**:
1. **Fresh Login**: Opens a new tab
2. **Existing Session**: Navigates in the same tab

**Implementation**:
```javascript
log('Step 1/3: Clicking "Start Playing" button...')

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
  return { success: false, message: 'Failed to click Start Playing button', error: err }
}
```

**What happens**:
- Click "Start Playing" button (tries primary, then fallback)
- Wait 3 seconds for new page to open
- **If new page opens** → Use new page as homePage
- **If no new page** → Use current page as homePage (session already active)

**Expected result**: 
- Fresh login → New tab opens with home page
- Existing session → Current tab navigates to home page

---

### **Step 2: Verify Home Page URL (Smart Check)**

**Actions**: Smart URL check + conditional navigation wait

**Implementation**:
```javascript
log('Step 2/3: Verifying home page URL...')

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
```

**What happens**:
- Check current URL first
- **If already at home** → Skip navigation wait (prevents hang)
- **If not at home** → Wait for navigation to complete
- Verify final URL contains `play.anghami.com/home`
- Accept any URL parameters (they vary at runtime)

**Why this is important**:
- When session is active, page may already be at home
- Waiting for navigation on a page that won't navigate causes infinite hang
- Smart check only waits when necessary

**Expected result**: Home page URL is verified, no unnecessary waits

---

### **Step 3: Verify Home Page is Ready (Angular App Loaded)**

**Action**: `waitForElement(page, selector)`

**Selector**: `a[href="/mymusic"]` - The "Your Library" navigation link

**Validation Element**:
```html
<a href="/mymusic">
  <anghami-icon class="icon">
    <svg role="img" title="nav-library">...</svg>
  </anghami-icon>
  <span>Your Library</span>
</a>
```

**Implementation**:
```javascript
log('Step 3/3: Verifying home page is ready...')

await waitForElement(homePage, 'a[href="/mymusic"]', { 
  state: 'visible',
  timeout: 10000 
})

success('✓ Home page verified - Navigation loaded')
```

**What happens**:
- Wait for "Your Library" navigation link to be visible
- Ensures Angular app is fully loaded and interactive
- Confirms critical navigation elements are present
- Timeout: 10 seconds

**Why "Your Library" element?**:
- Always visible on home page
- Part of main navigation (loaded early)
- Indicates Angular app is rendered
- Reliable indicator of interactive page

**Expected result**: Home page is fully loaded with navigation visible

---

### **Step 4: Return Page Objects**

**Implementation**:
```javascript
return {
  success: true,
  message: 'Navigate to home page completed successfully',
  homePage: homePage,
  loginPage: isNewTab ? currentPage : null,
  isNewTab: isNewTab
}
```

**What happens**:
- Return home page object for future operations
- Return login page only if new tab was opened
- Include `isNewTab` flag to inform caller of behavior

**Expected result**: Caller receives page objects and knows tab state

---

## 📄 Complete Implementation Code

```javascript
// src/flows/navigateToHomeFlow.js
const { clickElement } = require('../actions/clicks')
const { waitForElement, waitForNavigation } = require('../actions/waits')
const { waitForNewPage } = require('../actions/tabs')
const { log, success, error } = require('../utils/logger')

async function executeNavigateToHomeFlow(context, currentPage) {
  try {
    // Step 1: Click "Start Playing" button and detect tab behavior
    log('Step 1/3: Clicking "Start Playing" button...')
    
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
      return { success: false, message: 'Failed to click Start Playing button', error: err }
    }

    // Step 2: Verify home page URL (smart check - skip wait if already there)
    log('Step 2/3: Verifying home page URL...')
    
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

    // Step 3: Verify "Your Library" element is visible
    log('Step 3/3: Verifying home page is ready...')
    
    await waitForElement(homePage, 'a[href="/mymusic"]', { 
      state: 'visible',
      timeout: 10000 
    })
    
    success('✓ Home page verified - Navigation loaded')

    return {
      success: true,
      message: 'Navigate to home page completed successfully',
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
```

---

## 🎯 Action Block Usage Summary

| Step | Action Block | Module | New? | Notes |
|------|-------------|--------|------|-------|
| 1 | `clickElement()` | `clicks.js` | ✅ Existing | With fallback selector |
| 1 | `waitForNewPage()` | `tabs.js` | 🆕 **NEW** | 3-second timeout |
| 2 | `waitForNavigation()` | `waits.js` | ✅ Existing | **Conditional** - only if needed |
| 3 | `waitForElement()` | `waits.js` | ✅ Existing | Waits for `a[href="/mymusic"]` |

---

## 🔍 Selector Strategy

### **Step 1: "Start Playing" Button**

1. **Primary - `a.hamburger_get_app__Nktzh`**:
   - Link element with specific class
   - More stable than button (links don't change often)
   - Has href attribute for fallback navigation

2. **Fallback - `button.styles_button__tqz7W`**:
   - Button element with specific class
   - Alternative UI element for same action
   - Used if link is not available

### **Step 3: "Your Library" Navigation**

**Selector**: `a[href="/mymusic"]`

**Why this element?**:
- ✅ **Stable**: href attribute doesn't change
- ✅ **Fast lookup**: Direct attribute selector
- ✅ **No Angular dependency**: Works regardless of framework changes
- ✅ **Always visible**: Part of main navigation
- ✅ **Indicates app loaded**: Angular components are rendered

**Element Structure**:
```html
<a href="/mymusic">
  <anghami-icon class="icon">
    <svg role="img" title="nav-library">
      <use xlink:href="#all--nav-library"></use>
    </svg>
  </anghami-icon>
  <span>Your Library</span>
</a>
```

**Alternative Selectors** (if needed):
- `text=Your Library` - Text-based (language-dependent)
- `a[href="/mymusic"] >> text=Your Library` - Combined (very specific)

---

## 🆕 New Action Block Required

### **Module**: `src/actions/tabs.js`

#### **waitForNewPage(context, options)**

**Purpose**: Wait for a new page/tab to open

**Implementation**:
```javascript
async function waitForNewPage(context, options = {}) {
  const timeout = options.timeout || 10000
  
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      context.off('page', pageListener)
      reject(new Error('Timeout waiting for new page'))
    }, timeout)
    
    const pageListener = (page) => {
      clearTimeout(timeoutId)
      context.off('page', pageListener)
      resolve(page)
    }
    
    context.on('page', pageListener)
  })
}
```

**Returns**: New page object

---

#### **getPageByUrl(context, urlPattern)**

**Purpose**: Find existing page by URL pattern

**Implementation**:
```javascript
async function getPageByUrl(context, urlPattern) {
  const pages = context.pages()
  return pages.find(page => page.url().includes(urlPattern)) || null
}
```

**Returns**: Page object or null

---

#### **getAllPages(context)**

**Purpose**: Get all open pages

**Implementation**:
```javascript
async function getAllPages(context) {
  return context.pages()
}
```

**Returns**: Array of page objects

---

## 🔄 Integration with Main Flow

### **Updated `src/index.js`**:

```javascript
const { launchBrowser, createContext, createPage, closeBrowser } = require('./browser/browserManager')
const { executeLoginFlow } = require('./flows/loginFlow')
const { executeNavigateToHomeFlow } = require('./flows/navigateToHomeFlow')
const { log, success, error } = require('./utils/logger')

async function main() {
  let browser

  try {
    log('Starting Anghami scraper...')
    
    browser = await launchBrowser()
    const context = await createContext(browser)
    const page = await createPage(context)
    let homePage = null

    log('Browser launched successfully')

    // === LOGIN FLOW ===
    log('=== Running Login Flow ===')
    const loginResult = await executeLoginFlow(page)
    
    if (loginResult.success) {
      success('Login flow completed:', loginResult.message)
    } else {
      error('Login flow failed:', loginResult.message)
      return
    }

    // === NAVIGATE TO HOME FLOW ===
    log('=== Running Navigate to Home Flow ===')
    const navResult = await executeNavigateToHomeFlow(context, page)
    
    if (navResult.success) {
      success('Navigate to home completed:', navResult.message)
      homePage = navResult.homePage
      success(`Home page available at: ${homePage.url()}`)
    } else {
      error('Navigate to home failed:', navResult.message)
      return
    }

    // === FUTURE FLOWS ===
    // log('=== Running Get Liked Songs Flow ===')
    // await getLikedSongsFlow(homePage, output)

    // Keep browser open for inspection
    log('All flows completed. Press Ctrl+C to close browser.')
    await new Promise(() => {}) // Keep process alive

  } catch (err) {
    error('Fatal error:', err.message)
    throw err
  }
}

main().catch(console.error)
```

---

## ⚠️ Error Handling

### **Possible Failures**

| Failure | Cause | Retry? | User Action |
|---------|-------|--------|-------------|
| Button not found | Page structure changed | ✅ Yes (tries fallback) | Update selectors |
| New page timeout | No tab opened (3s) | ❌ No | Normal - uses same tab |
| Wrong URL loaded | Unexpected redirect | ❌ No | Verify login state |
| Navigation timeout | Page already at home | ✅ Yes (skipped via smart check) | No action needed |
| "Your Library" not found | Angular app not loaded | ✅ Yes (10s timeout) | Check network/console |

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

## 🔄 Two Navigation Scenarios

### **Scenario 1: Fresh Login (No Existing Session)**

**Behavior**:
1. User completes QR code login
2. "Start Playing" button opens **new tab**
3. New tab loads `https://play.anghami.com/home`
4. Original login page remains open

**Flow Path**:
- Step 1: New tab detected → `isNewTab = true`
- Step 2: Waits for navigation (page is navigating)
- Step 3: Validates "Your Library" element

**Console Output**:
```
[INFO] Step 1/3: Clicking "Start Playing" button...
[SUCCESS] ✓ New tab opened
[INFO] Step 2/3: Verifying home page URL...
[SUCCESS] ✓ Home page URL verified: https://play.anghami.com/home?...
[INFO] Step 3/3: Verifying home page is ready...
[SUCCESS] ✓ Home page verified - Navigation loaded
[SUCCESS] New tab opened - Home page at: https://play.anghami.com/home?...
[INFO] Login page still available in original tab
```

---

### **Scenario 2: Existing Session (Cookies Loaded)**

**Behavior**:
1. Session cookies are loaded
2. User is already logged in
3. "Start Playing" button navigates **in same tab**
4. No new tab opens

**Flow Path**:
- Step 1: No new tab after 3s → `isNewTab = false`, uses current page
- Step 2: **Page already at home** → Skips navigation wait (smart check)
- Step 3: Validates "Your Library" element

**Console Output**:
```
[SUCCESS] ✓ Existing session is valid, skipping login
[INFO] Step 1/3: Clicking "Start Playing" button...
[SUCCESS] ✓ Navigating in current tab
[INFO] Step 2/3: Verifying home page URL...
[SUCCESS] ✓ Home page URL verified: https://play.anghami.com/home?...
[INFO] Step 3/3: Verifying home page is ready...
[SUCCESS] ✓ Home page verified - Navigation loaded
[SUCCESS] Current tab navigated - Home page at: https://play.anghami.com/home?...
```

**Key Difference**: 
- ✅ No hang on navigation wait (smart check detects URL already at home)
- ✅ Uses current page object (no new tab created)
- ✅ Fast execution (no unnecessary waits)

---

## 🧪 Testing Checklist

- [ ] "Start Playing" button is clickable (option 1)
- [ ] Fallback button works (option 2)
- [ ] New tab opens successfully
- [ ] Home page URL is correct (`play.anghami.com/home`)
- [ ] Home page is interactive
- [ ] Both pages remain open
- [ ] Home page object is returned correctly

---

## 📊 Expected Output

### **Scenario 1: Fresh Login (New Tab Behavior)**
```
[SUCCESS] Login flow completed: Login flow completed successfully
[INFO] === Running Navigate to Home Flow ===
[INFO] Step 1/3: Clicking "Start Playing" button...
[SUCCESS] ✓ New tab opened
[INFO] Step 2/3: Verifying home page URL...
[SUCCESS] ✓ Home page URL verified: https://play.anghami.com/home?_branch_match_id=1378389409698293030&utm_source=web&utm_medium=landing_page&_branch_referrer=...
[INFO] Step 3/3: Verifying home page is ready...
[SUCCESS] ✓ Home page verified - Navigation loaded
[SUCCESS] Navigate to home completed: Navigate to home page completed successfully
[SUCCESS] New tab opened - Home page at: https://play.anghami.com/home?...
[INFO] Login page still available in original tab
[INFO] All flows completed. Press Ctrl+C to close browser.
```

### **Scenario 2: Existing Session (Same Tab Behavior)**
```
[INFO] === Checking for existing session ===
[INFO] Session cookies loaded, verifying validity...
[SUCCESS] ✓ Existing session is valid, skipping login
[INFO] === Running Navigate to Home Flow ===
[INFO] Step 1/3: Clicking "Start Playing" button...
[SUCCESS] ✓ Navigating in current tab
[INFO] Step 2/3: Verifying home page URL...
[SUCCESS] ✓ Home page URL verified: https://play.anghami.com/home?_branch_match_id=...
[INFO] Step 3/3: Verifying home page is ready...
[SUCCESS] ✓ Home page verified - Navigation loaded
[SUCCESS] Navigate to home completed: Navigate to home page completed successfully
[SUCCESS] Current tab navigated - Home page at: https://play.anghami.com/home?...
[INFO] All flows completed. Press Ctrl+C to close browser.
```

---

## 🚀 Usage Pattern

### **Manual Control**

Each flow can be enabled/disabled by commenting:

```javascript
// ALWAYS RUN: Login is required
const loginResult = await executeLoginFlow(page)

// OPTIONAL: Comment out if not needed
const navResult = await executeNavigateToHomeFlow(context, page)

// OPTIONAL: Comment out if not needed
// await getLikedSongsFlow(homePage, output)
```

### **Page Object Usage**

After this flow completes:
- `page` → Login page (still open)
- `homePage` → Home page (newly opened)

Future flows should use `homePage`:
```javascript
await getLikedSongsFlow(homePage, output)  // Use homePage, not page
```

---

## 🎯 Design Decisions

### **1. Keep Both Pages Open**
- **Reason**: Flexibility for future operations
- **Benefit**: Can switch between pages if needed
- **Downside**: Uses more memory (minimal impact)

### **2. Specific Class Selectors**
- **Reason**: More precise than text selectors
- **Benefit**: Faster, more reliable
- **Downside**: May break if classes change (mitigated by fallback)

### **3. Manual Flow Control**
- **Reason**: Each flow can run independently
- **Benefit**: Easy to test and debug individual flows
- **Downside**: Requires commenting/uncommenting code (acceptable for this use case)

---

## 📚 Related Documentation

- `ARCHITECTURE_PLAN.md` - Complete system architecture
- `LOGIN_FLOW_IMPLEMENTATION.md` - Login flow details

---

## ✅ Key Improvements in This Implementation

### **1. Handles Both Navigation Scenarios**
- ✅ Fresh login → New tab detection
- ✅ Existing session → Same tab navigation
- ✅ No code changes needed - works automatically

### **2. Prevents Navigation Hang**
- ✅ Smart URL check before waiting for navigation
- ✅ Only waits when page is actually navigating
- ✅ Fixes issue where existing session caused infinite wait

### **3. Reliable Home Page Validation**
- ✅ Uses "Your Library" element (`a[href="/mymusic"]`)
- ✅ Validates Angular app is loaded
- ✅ More reliable than generic `body` element

### **4. Clear Status Reporting**
- ✅ Different messages for new tab vs same tab
- ✅ Shows which scenario occurred
- ✅ Helps debugging and understanding flow behavior

---

**Status**: Updated with dual-scenario handling and smart navigation check  
**Dependencies**: Requires `tabs.js` action block  
**Last Updated**: 2026-02-20  
**Version**: 2.0 (Added session-aware navigation)
