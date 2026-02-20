# 📋 Scrape All Playlists Flow - Implementation Plan

## 🎯 Overview
Discover all user playlists, iterate through each one, and scrape all songs from every playlist using the `scrapePlaylistSongsFlow`.

---

## 📍 Context & Prerequisites

### **When This Flow Runs**
- After successful login and navigation to home/library page
- User is on the `/mymusic` page
- "Playlists" category in the library menu needs to be selected

### **Expected Inputs**
- `page` - Playwright page object (on `/mymusic` page)
- `outputBuilder` - OutputBuilder instance to store results

### **Expected Outputs**
```javascript
{
  success: boolean,
  message: string,
  totalPlaylists: number,
  totalSongs: number,
  playlists: PlaylistCard[],
  error?: Error
}
```

---

## 🔧 Implementation Steps

### **Step 1: Click "Playlists" Category**
**Purpose**: Navigate to the playlists view in the library

**Action Blocks**:
- `clickElement(page, selector)` from `clicks.js`
- `waitForElement(page, selector)` from `waits.js`

**Implementation**:
1. Click the "Playlists" menu item:
   - Selector: `div.menu-tab-item:has-text("Playlists")`
   - From `songsOptionsFlow.js`, we know the menu items exist
   
2. Wait for playlists container to load:
   - Selector: `#scroll_window > anghami-mymusic-new > div > div > div.mymusic-displayed-content`
   - Fallback: `.mymusic-displayed-content`
   - Timeout: 10 seconds

3. Log success message

**Success Criteria**: Playlists container is visible

**Error Handling**: Return failure if container doesn't load

---

### **Step 2: Scroll to Load All Playlist Cards**
**Purpose**: Handle infinite scroll to discover all playlists

**Action Blocks**:
- Reuse scrolling logic from `scrapeLikesFlow.js`

**Implementation**:
1. Initialize scroll tracking:
   ```javascript
   let previousCount = 0
   let currentCount = 0
   let scrollAttempts = 0
   const maxScrolls = 50  // Fewer than songs (playlists load faster)
   const scrollDelay = 2000
   ```

2. Determine scroll container:
   - Primary: `#scroll_window`
   - Fallback: `#base_content`

3. Scroll loop to load all playlist cards:
   - Count playlist cards: `div.position-relative:has(a.card-item-image-container[href*="/playlist/"])`
   - Scroll container to bottom
   - Scroll last playlist card into view
   - Wait for delay
   - Check if count increased

4. Log final playlist count

**Success Criteria**: Playlist count stops increasing for 2 consecutive checks

**Performance**: Playlists typically load faster than songs (smaller data)

---

### **Step 3: Extract All Playlist Card Elements**
**Purpose**: Get all playlist card elements for iteration

**Action Blocks**:
- `page.locator()` (Playwright built-in)

**Implementation**:
1. Get all playlist card containers:
   ```javascript
   const playlistCards = await page.locator('div.position-relative:has(a.card-item-image-container[href*="/playlist/"])').all()
   ```

2. Validate count > 0:
   ```javascript
   if (playlistCards.length === 0) {
     log('⚠ No playlists found')
     return {
       success: true,
       message: 'No playlists to scrape',
       totalPlaylists: 0,
       totalSongs: 0,
       playlists: []
     }
   }
   ```

3. Log total playlists found

**Success Criteria**: At least 1 playlist card found (or graceful return if 0)

---

### **Step 4: Extract Playlist Metadata from Cards**
**Purpose**: Get basic info (name, URL, song count) from each playlist card before navigating

**Action Blocks**:
- Text extraction using Playwright locators

**Implementation**:
For each playlist card, extract:

```javascript
const playlistLinks = []

for (const card of playlistCards) {
  try {
    // Extract playlist URL
    const linkElement = card.locator('a.card-item-image-container[href*="/playlist/"]')
    const href = await linkElement.getAttribute('href')
    const playlistUrl = href.startsWith('http') ? href : `https://play.anghami.com${href}`
    
    // Extract playlist name
    const nameElement = card.locator('a.card-item-title')
    const playlistName = (await nameElement.textContent()).trim()
    
    // Extract song count (optional)
    let songCountPreview = null
    try {
      const subtitleElement = card.locator('div.card-item-subtitle')
      songCountPreview = (await subtitleElement.textContent()).trim()
    } catch (err) {
      // Song count not available
    }
    
    playlistLinks.push({
      url: playlistUrl,
      name: playlistName,
      songCountPreview: songCountPreview,
      index: playlistLinks.length
    })
    
  } catch (err) {
    error(`Failed to extract playlist card: ${err.message}`)
  }
}

log(`✓ Extracted ${playlistLinks.length} playlist links`)
```

**Data Structure**:
```javascript
{
  url: "https://play.anghami.com/playlist/8515647",
  name: "Windows Down, Volume Up",
  songCountPreview: "94 song",
  index: 0
}
```

**Success Criteria**: At least some playlist links extracted

---

### **Step 5: Iterate Through Playlists & Scrape Songs**
**Purpose**: Navigate to each playlist and run `scrapePlaylistSongsFlow`

**Action Blocks**:
- `goTo(page, url)` from `navigation.js`
- `scrapePlaylistSongsFlow()` from `flows/scrapePlaylistSongsFlow.js`
- `goBack(page)` from `navigation.js`

**Implementation**:
```javascript
const scrapedPlaylists = []
let totalSongsScraped = 0

for (let i = 0; i < playlistLinks.length; i++) {
  const playlist = playlistLinks[i]
  
  try {
    log(`[${i + 1}/${playlistLinks.length}] Scraping: ${playlist.name}`)
    
    // Navigate to playlist page
    await page.goto(playlist.url, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000) // Let page settle
    
    // Scrape playlist songs
    const result = await scrapePlaylistSongsFlow(page, playlist.url, outputBuilder)
    
    if (result.success) {
      scrapedPlaylists.push(result.playlistCard)
      totalSongsScraped += result.playlistCard.songCount
      
      success(`✓ ${result.playlistCard.toString()}`)
    } else {
      error(`✗ Failed to scrape "${playlist.name}": ${result.message}`)
    }
    
    // Navigate back to playlists page
    log('  Returning to playlists page...')
    await page.goto('https://play.anghami.com/mymusic', { waitUntil: 'domcontentloaded' })
    
    // Wait for playlists to load again
    await waitForElement(page, '.mymusic-displayed-content', {
      state: 'visible',
      timeout: 10000
    })
    
    // Re-click "Playlists" to ensure we're on the right view
    await clickElement(page, 'div.menu-tab-item:has-text("Playlists")')
    await page.waitForTimeout(1000)
    
  } catch (err) {
    error(`Failed to process playlist "${playlist.name}": ${err.message}`)
    // Continue with next playlist
  }
}

success(`✓ Scraped ${scrapedPlaylists.length}/${playlistLinks.length} playlists`)
success(`✓ Total songs: ${totalSongsScraped}`)
```

**Navigation Strategy**:
- Navigate to each playlist URL directly
- Run `scrapePlaylistSongsFlow`
- Navigate back to `/mymusic` (playlists view)
- Re-ensure "Playlists" is selected

**Error Handling**: If one playlist fails, continue with the next

---

### **Step 6: Return Summary**
**Purpose**: Return complete results with statistics

**Implementation**:
```javascript
return {
  success: true,
  message: `Scraped ${scrapedPlaylists.length} playlists with ${totalSongsScraped} total songs`,
  totalPlaylists: scrapedPlaylists.length,
  totalSongs: totalSongsScraped,
  playlists: scrapedPlaylists
}
```

---

## 📁 New Files Required

### **1. `src/flows/scrapeAllPlaylistsFlow.js`** (NEW)
Main flow implementation file

### **2. `src/actions/navigation.js`** (UPDATE)
Add `goBack()` method if not already present

---

## 🔄 Function Signature

```javascript
async function scrapeAllPlaylistsFlow(page, outputBuilder)
```

**Parameters**:
- `page` - Playwright page object (must be on `/mymusic` page)
- `outputBuilder` - OutputBuilder instance

**Returns**:
```javascript
{
  success: boolean,
  message: string,
  totalPlaylists: number,
  totalSongs: number,
  playlists: PlaylistCard[],
  error?: Error
}
```

---

## 🎨 Selectors Reference

| Element | Selector | Purpose |
|---------|----------|---------|
| Playlists Menu Item | `div.menu-tab-item:has-text("Playlists")` | Click to view playlists |
| Playlists Container | `.mymusic-displayed-content` | Main container |
| Playlist Card | `div.position-relative:has(a.card-item-image-container[href*="/playlist/"])` | Each playlist card |
| Playlist Link | `a.card-item-image-container[href*="/playlist/"]` | Playlist URL |
| Playlist Name | `a.card-item-title` | Playlist name text |
| Song Count | `div.card-item-subtitle` | Preview of song count |

---

## 🔒 Edge Cases & Error Handling

### **1. No Playlists**
- **Detection**: 0 playlist cards after loading
- **Action**: Return success with empty array
- **Log**: "No playlists found"

### **2. Individual Playlist Failure**
- **Detection**: `scrapePlaylistSongsFlow` returns failure
- **Action**: Log error, continue with next playlist
- **Result**: Partial success (some playlists scraped)

### **3. Navigation Failure**
- **Detection**: Cannot navigate to playlist or back to `/mymusic`
- **Action**: Log error, skip playlist, continue
- **Recovery**: Try to navigate back to `/mymusic` before next iteration

### **4. Page State Lost**
- **Detection**: After returning to `/mymusic`, playlists view not active
- **Action**: Re-click "Playlists" menu item
- **Prevention**: Always re-select "Playlists" after returning

### **5. Slow Loading**
- **Detection**: Timeout waiting for elements
- **Action**: Retry with longer timeout
- **Log**: Warning about slow loading

---

## 🧪 Testing Strategy

### **Manual Testing**:
1. Test with user having 1-2 playlists (quick test)
2. Test with user having 10+ playlists (full test)
3. Test with empty playlists (edge case)
4. Test navigation back and forth
5. Test with 1 failing playlist (error handling)

### **Validation**:
- All playlists discovered and scraped
- All songs from each playlist extracted
- Navigation doesn't get stuck
- Output JSON contains all playlists
- No duplicate playlists

---

## 📊 Expected Output Structure

```json
{
  "metadata": {
    "scrapedAt": "2026-02-20T14:00:00.000Z",
    "totalPlaylists": 3,
    "totalSongs": 1800
  },
  "likedSongs": [],
  "playlists": [
    {
      "id": "8515647",
      "name": "Windows Down, Volume Up",
      "url": "https://play.anghami.com/playlist/8515647",
      "songCount": 94,
      "scrapedAt": "2026-02-20T14:05:30.000Z",
      "songs": [...]
    },
    {
      "id": "1234567",
      "name": "Workout Mix",
      "url": "https://play.anghami.com/playlist/1234567",
      "songCount": 45,
      "scrapedAt": "2026-02-20T14:08:15.000Z",
      "songs": [...]
    }
  ]
}
```

---

## ⚡ Performance Considerations

### **Time Estimation**:
- **Playlist Discovery**: ~10-30 seconds (depends on count, scroll speed)
- **Per Playlist Scraping**: ~30-120 seconds (depends on song count)
- **Total Time**: Discovery + (Average Scrape Time × Playlist Count)
- **Example**: 10 playlists × 60s = ~10-15 minutes

### **Optimization**:
- Scroll delay: 2 seconds (balance speed vs reliability)
- Max scrolls: 50 (playlists load faster than songs)
- Navigation delay: 1-2 seconds (let pages settle)
- Progress logging: After each playlist (visibility)

### **Memory**:
- All playlists stored in `outputBuilder` as they're scraped
- No intermediate storage needed
- Large playlist collections handled gracefully

---

## 🔗 Integration with Main Flow

### **In `src/index.js`**:
```javascript
const { scrapeAllPlaylistsFlow } = require('./flows/scrapeAllPlaylistsFlow')

// After login and navigation to home
log('=== Scraping All Playlists ===')
const playlistsResult = await scrapeAllPlaylistsFlow(homePage, output)

if (playlistsResult.success) {
  success(`✓ Scraped ${playlistsResult.totalPlaylists} playlists`)
  success(`✓ Total songs: ${playlistsResult.totalSongs}`)
} else {
  error('Failed to scrape playlists:', playlistsResult.message)
}

// Save output
await output.save(config.paths.output)
```

---

## 🎯 Dependencies

### **Required**:
- `clickElement` from `actions/clicks.js` ✅
- `waitForElement` from `actions/waits.js` ✅
- `goTo` from `actions/navigation.js` ✅
- `goBack` from `actions/navigation.js` ⚠️ (needs verification)
- `scrapePlaylistSongsFlow` from `flows/scrapePlaylistSongsFlow.js` ✅
- `PlaylistCard` from `models/PlaylistCard.js` ✅
- `outputBuilder` from `output/outputBuilder.js` ✅

### **New Additions Needed**:
- Possibly `goBack()` in `navigation.js` if not present

---

## ✅ Success Criteria

1. ✅ All playlists discovered via scrolling
2. ✅ All playlist metadata extracted from cards
3. ✅ Each playlist navigated to and scraped
4. ✅ All songs from all playlists collected
5. ✅ Navigation back to playlists view works
6. ✅ Individual playlist failures don't stop the flow
7. ✅ Final summary statistics are accurate
8. ✅ All data stored in OutputBuilder
9. ✅ Complies with architecture plan

---

## 📝 Implementation Order

1. Click "Playlists" category (Step 1)
2. Scroll to load all playlist cards (Step 2)
3. Extract playlist card elements (Step 3)
4. Extract metadata from each card (Step 4)
5. Iterate and scrape each playlist (Step 5)
6. Return summary (Step 6)
7. Test with sample playlists
8. Integrate with main flow

---

**Status**: Ready for implementation
**Dependencies**: scrapePlaylistSongsFlow, PlaylistCard, Action blocks
**Last Updated**: 2026-02-20
