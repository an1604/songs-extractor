# Scrape Likes Flow Implementation

## 📋 Flow Definition Reference

**Source**: `anghami/flows/scrape_likes.txt`

**Purpose**: Scrape all liked songs from the user's library and save to structured JSON

**Steps**:
1. Once "Navigate to the home page" stage done (at `/mymusic`)
2. Locate the songs container
3. Click "Likes" category button
4. Scroll to load all songs (infinite scroll handling)
5. Extract all song elements
6. For each song, extract:
   - Song title
   - Artist name
   - Album name (optional)
7. Save to JSON via OutputBuilder

---

## 🎯 Objective

Scrape all liked songs from the user's Anghami library, handling:
- Infinite scroll / lazy loading
- Large song libraries (1000+ songs)
- Missing/optional data fields
- Progress reporting during extraction

---

## 🏗️ Implementation Architecture

### **New Files Required**:

1. **`src/flows/scrapeLikesFlow.js`** - Main scrape flow
2. **`src/output/outputBuilder.js`** - JSON output builder
3. **`src/utils/fileSystem.js`** - File operations (optional, can use fs directly)

### **File**: `src/flows/scrapeLikesFlow.js`

### **Dependencies**:
```javascript
const { clickElement } = require('../actions/clicks')
const { waitForElement } = require('../actions/waits')
const { log, success, error } = require('../utils/logger')
```

### **Function Signature**:
```javascript
async function scrapeLikesFlow(page, outputBuilder)
```

**Parameters**:
- `page` - Playwright page object (must be at library page `/mymusic`)
- `outputBuilder` - OutputBuilder instance for structured JSON output

**Returns**:
```javascript
{
  success: true/false,
  message: string,
  songsCount: number,
  songs: [
    { title: 'Song Name', artist: 'Artist Name', album: 'Album Name' }
  ],
  error?: Error
}
```

---

## 📝 Step-by-Step Implementation

### **Step 1: Click "Likes" Category**

**Action**: `clickElement(page, selector)`

**Selector**: `div.menu-tab-item:has-text("Likes")`

**Implementation**:
```javascript
log('Step 1/5: Selecting "Likes" category...')

const likesSelector = 'div.menu-tab-item:has-text("Likes")'
const clickResult = await clickElement(page, likesSelector)

if (!clickResult.success) {
  return { success: false, message: 'Failed to click Likes category', error: clickResult.error }
}

success('✓ "Likes" category selected')
```

**What happens**:
- Find the "Likes" menu item in the category list
- Click it to load liked songs in the content area
- May or may not trigger URL change
- Content area updates to show liked songs

**Expected result**: Liked songs start appearing in the content area

---

### **Step 2: Wait for Initial Songs to Load**

**Action**: `waitForElement(page, selector)`

**Selector**: `a.table-row`

**Implementation**:
```javascript
log('Step 2/5: Waiting for liked songs to load...')

await waitForElement(page, 'a.table-row', {
  state: 'visible',
  timeout: 10000
})

success('✓ Initial songs loaded')
```

**What happens**:
- Wait for at least one song row to be visible
- Ensures Angular has rendered the initial batch
- Timeout: 10 seconds for slow networks
- Confirms content area is populated

**Expected result**: At least one song row is visible in the DOM

**Song Row Structure**:
```html
<a class="table-row no-style-link" itemtype="list">
  <!-- Song cells inside -->
</a>
```

---

### **Step 3: Scroll to Load All Songs** 🆕 **INFINITE SCROLL**

**Action**: Scroll to bottom repeatedly until no new songs load

**Strategy**:
1. Count current visible songs
2. Scroll to bottom of page
3. Wait for new content to load (2 seconds)
4. Count songs again
5. If count increased → repeat
6. If count stayed same → all songs loaded
7. Safety limit: max 100 scrolls

**Implementation**:
```javascript
log('Step 3/5: Scrolling to load all songs...')

let previousCount = 0
let currentCount = 0
let scrollAttempts = 0
const maxScrolls = 100
const scrollDelay = 2000

while (scrollAttempts < maxScrolls) {
  // Get current count of songs
  currentCount = await page.locator('a.table-row').count()
  
  // If count hasn't changed, we've loaded all songs
  if (currentCount === previousCount && scrollAttempts > 0) {
    success(`✓ All songs loaded (${currentCount} songs)`)
    break
  }
  
  // Log progress
  if (scrollAttempts > 0) {
    log(`  Loaded ${currentCount} songs... scrolling for more`)
  }
  
  // Scroll to bottom
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight)
  })
  
  // Wait for new content to load
  await page.waitForTimeout(scrollDelay)
  
  previousCount = currentCount
  scrollAttempts++
}

if (scrollAttempts >= maxScrolls) {
  log(`⚠ Warning: Reached max scroll limit (${maxScrolls})`)
}

success(`✓ Scrolling complete - found ${currentCount} songs`)
```

**What happens**:
- Scroll to bottom of page using `window.scrollTo()`
- Wait 2 seconds for Angular to load new songs
- Count total song rows
- Compare with previous count
- Stop when count doesn't increase
- Safety limit prevents infinite loops

**Why this works**:
- Anghami uses lazy loading (loads ~50 songs at a time)
- Scrolling triggers Angular to load next batch
- When no more songs exist, count stops increasing

**Expected result**: All liked songs are loaded in the DOM (can be hundreds)

---

### **Step 4: Extract All Song Elements**

**Action**: Get all song row locators

**Selector**: `a.table-row`

**Implementation**:
```javascript
log('Step 4/5: Extracting song elements...')

const songRows = await page.locator('a.table-row').all()

if (songRows.length === 0) {
  return { success: false, message: 'No liked songs found' }
}

success(`✓ Found ${songRows.length} liked songs`)
```

**What happens**:
- Get all song row elements now in DOM (after scrolling)
- Verify at least one exists
- Prepare array for detail extraction

**Expected result**: Array of song row locator objects

---

### **Step 5: Extract Song Details from Each Row**

**Action**: Loop through rows and extract title, artist, album

**Data to Extract**:
1. **Song Title**: From `div.cell-title span`
2. **Artist Name**: From `div.cell-artist a`
3. **Album Name**: From `div.cell-album a` (optional)

**Implementation**:
```javascript
log('Step 5/5: Extracting song details...')

const songs = []
let extracted = 0

for (const row of songRows) {
  try {
    // Extract title
    const titleElement = row.locator('div.cell-title span')
    const title = (await titleElement.textContent()).trim()
    
    // Extract artist
    const artistElement = row.locator('div.cell-artist a')
    const artist = (await artistElement.textContent()).trim()
    
    // Extract album (optional - may not exist)
    let album = null
    try {
      const albumElement = row.locator('div.cell-album a')
      album = (await albumElement.textContent()).trim()
    } catch (err) {
      // Album not available for this song
    }
    
    // Create song object
    const song = { title, artist, album }
    songs.push(song)
    
    // Add to output builder
    outputBuilder.addLikedSong(song)
    
    extracted++
    
    // Show progress every 50 songs
    if (extracted % 50 === 0) {
      log(`  Extracted ${extracted}/${songRows.length} songs...`)
    }
    
  } catch (err) {
    error(`Failed to extract song: ${err.message}`)
    // Continue with next song
  }
}

success(`✓ Extracted ${songs.length} songs`)
```

**What happens**:
- Loop through each song row
- Extract title from span text
- Extract artist from link text
- Try to extract album (fails gracefully if missing)
- Add to results array
- Add to output builder (for JSON)
- Show progress every 50 songs
- Continue on error (don't fail entire scrape)

**Expected result**: Array of song objects with complete data

---

## 📄 Complete Implementation Code

```javascript
// src/flows/scrapeLikesFlow.js
const { clickElement } = require('../actions/clicks')
const { waitForElement } = require('../actions/waits')
const { log, success, error } = require('../utils/logger')

async function scrapeLikesFlow(page, outputBuilder) {
  try {
    // Step 1: Click "Likes" category
    log('Step 1/5: Selecting "Likes" category...')
    
    const likesSelector = 'div.menu-tab-item:has-text("Likes")'
    const clickResult = await clickElement(page, likesSelector)
    
    if (!clickResult.success) {
      return { success: false, message: 'Failed to click Likes category', error: clickResult.error }
    }
    
    success('✓ "Likes" category selected')

    // Step 2: Wait for initial songs to load
    log('Step 2/5: Waiting for liked songs to load...')
    
    await waitForElement(page, 'a.table-row', {
      state: 'visible',
      timeout: 10000
    })
    
    success('✓ Initial songs loaded')

    // Step 3: Scroll to load all songs
    log('Step 3/5: Scrolling to load all songs...')
    
    let previousCount = 0
    let currentCount = 0
    let scrollAttempts = 0
    const maxScrolls = 100
    const scrollDelay = 2000
    
    while (scrollAttempts < maxScrolls) {
      // Get current count
      currentCount = await page.locator('a.table-row').count()
      
      // Check if count stopped increasing
      if (currentCount === previousCount && scrollAttempts > 0) {
        success(`✓ All songs loaded (${currentCount} songs)`)
        break
      }
      
      // Log progress
      if (scrollAttempts > 0) {
        log(`  Loaded ${currentCount} songs... scrolling for more`)
      }
      
      // Scroll to bottom
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight)
      })
      
      // Wait for new content
      await page.waitForTimeout(scrollDelay)
      
      previousCount = currentCount
      scrollAttempts++
    }
    
    if (scrollAttempts >= maxScrolls) {
      log(`⚠ Warning: Reached max scroll limit (${maxScrolls})`)
    }
    
    success(`✓ Scrolling complete - found ${currentCount} songs`)

    // Step 4: Get all song rows
    log('Step 4/5: Extracting song elements...')
    
    const songRows = await page.locator('a.table-row').all()
    
    if (songRows.length === 0) {
      return { success: false, message: 'No liked songs found' }
    }
    
    success(`✓ Found ${songRows.length} liked songs`)

    // Step 5: Extract details from each row
    log('Step 5/5: Extracting song details...')
    
    const songs = []
    let extracted = 0
    
    for (const row of songRows) {
      try {
        // Extract title
        const titleElement = row.locator('div.cell-title span')
        const title = (await titleElement.textContent()).trim()
        
        // Extract artist
        const artistElement = row.locator('div.cell-artist a')
        const artist = (await artistElement.textContent()).trim()
        
        // Extract album (optional)
        let album = null
        try {
          const albumElement = row.locator('div.cell-album a')
          album = (await albumElement.textContent()).trim()
        } catch (err) {
          // Album not available
        }
        
        // Add to results
        const song = { title, artist, album }
        songs.push(song)
        
        // Add to output builder
        outputBuilder.addLikedSong(song)
        
        extracted++
        
        // Show progress every 50 songs
        if (extracted % 50 === 0) {
          log(`  Extracted ${extracted}/${songRows.length} songs...`)
        }
        
      } catch (err) {
        error(`Failed to extract song: ${err.message}`)
      }
    }
    
    success(`✓ Extracted ${songs.length} songs`)

    return {
      success: true,
      message: 'Scrape likes completed successfully',
      songsCount: songs.length,
      songs: songs
    }

  } catch (err) {
    error('Scrape likes failed:', err.message)
    return {
      success: false,
      message: 'Scrape likes failed',
      error: err
    }
  }
}

module.exports = { scrapeLikesFlow }
```

---

## 📦 Output Builder Implementation

### **File**: `src/output/outputBuilder.js`

```javascript
class OutputBuilder {
  constructor() {
    this.data = {
      metadata: {
        scrapedAt: new Date().toISOString(),
        totalSongs: 0,
        totalPlaylists: 0,
        totalAlbums: 0,
        totalArtists: 0
      },
      likedSongs: [],
      playlists: [],
      albums: [],
      artists: []
    }
  }

  addLikedSong(song) {
    this.data.likedSongs.push(song)
    this.data.metadata.totalSongs++
  }

  addPlaylist(playlist) {
    this.data.playlists.push(playlist)
    this.data.metadata.totalPlaylists++
  }

  addAlbum(album) {
    this.data.albums.push(album)
    this.data.metadata.totalAlbums++
  }

  addArtist(artist) {
    this.data.artists.push(artist)
    this.data.metadata.totalArtists++
  }

  async save(filepath) {
    const fs = require('fs').promises
    const path = require('path')
    
    // Ensure directory exists
    const dir = path.dirname(filepath)
    await fs.mkdir(dir, { recursive: true })
    
    // Write JSON file
    await fs.writeFile(
      filepath, 
      JSON.stringify(this.data, null, 2), 
      'utf8'
    )
  }

  async load(filepath) {
    const fs = require('fs').promises
    const data = await fs.readFile(filepath, 'utf8')
    this.data = JSON.parse(data)
  }
}

module.exports = { OutputBuilder }
```

---

## 🔄 Integration with Main Flow

### **Updated `src/index.js`**:

```javascript
const { OutputBuilder } = require('./output/outputBuilder')
const { scrapeLikesFlow } = require('./flows/scrapeLikesFlow')

async function main() {
  // ... (existing flows: login, navigate, extract options)
  
  // Create output builder
  const output = new OutputBuilder()
  
  // === SCRAPE LIKED SONGS ===
  log('=== Scraping Liked Songs ===')
  const likesResult = await scrapeLikesFlow(homePage, output)
  
  if (likesResult.success) {
    success(`Scrape likes completed: ${likesResult.songsCount} songs extracted`)
  } else {
    error('Scrape likes failed:', likesResult.message)
    if (likesResult.error) {
      error('Error details:', likesResult.error.message)
    }
    return
  }
  
  // Save output to JSON
  log('=== Saving Results ===')
  await output.save(config.paths.output)
  success(`Data saved to: ${config.paths.output}`)
}
```

---

## 🔍 Element Structure Analysis

### **Song Row Container**:
```html
<a class="table-row no-style-link" itemtype="list" intersectionobserver="" anghamiextras="">
  <!-- Multiple cell divs inside -->
</a>
```

**Selector**: `a.table-row`
- Each liked song is one `<a>` element
- Contains multiple `div.cell` children for different data
- Has various Angular attributes (can be ignored)

---

### **Song Title Cell**:
```html
<div class="cell cell-title" dir="auto">
  <span> Neighbor (feat. Travis Scott) </span>
</div>
```

**Selector**: `div.cell-title span`
- ✅ Direct text content
- ✅ Stable class structure
- ✅ May include featured artists in parentheses

---

### **Artist Cell**:
```html
<div class="cell cell-artist">
  <a class="underline-hover" href="/artist/3838" dir="auto">Juicy J</a>
</div>
```

**Selector**: `div.cell-artist a`
- ✅ Link to artist page
- ✅ Text is artist name
- ✅ Has artist ID in href (could extract for future use)

---

### **Album Cell** (Optional):
```html
<div class="cell cell-album underline-hover large-devices">
  <a class="underline-hover" href="/album/5146211" dir="auto">Neighbor (feat. Travis Scott)</a>
</div>
```

**Selector**: `div.cell-album a`
- ⚠️ May not exist for all songs (singles without album)
- ✅ Link to album page
- ✅ Has album ID in href (could extract for future use)
- ⚠️ Has class `large-devices` (may be hidden on small screens)

---

## 🎯 Action Block Usage Summary

| Step | Action Block | Module | Existing? |
|------|-------------|--------|-----------|
| 1 | `clickElement()` | `clicks.js` | ✅ Yes |
| 2 | `waitForElement()` | `waits.js` | ✅ Yes |
| 3 | Playwright `.evaluate()`, `.waitForTimeout()` | Built-in | ✅ Yes |
| 4 | Playwright `.locator().all()` | Built-in | ✅ Yes |
| 5 | Playwright `.textContent()` | Built-in | ✅ Yes |

**Note**: No new action blocks needed - uses existing actions and Playwright built-ins

---

## 📊 Expected Output

### **Console Output**:
```
[INFO] === Scraping Liked Songs ===
[INFO] Step 1/5: Selecting "Likes" category...
[SUCCESS] ✓ "Likes" category selected
[INFO] Step 2/5: Waiting for liked songs to load...
[SUCCESS] ✓ Initial songs loaded
[INFO] Step 3/5: Scrolling to load all songs...
[INFO]   Loaded 50 songs... scrolling for more
[INFO]   Loaded 100 songs... scrolling for more
[INFO]   Loaded 150 songs... scrolling for more
[INFO]   Loaded 200 songs... scrolling for more
[INFO]   Loaded 245 songs... scrolling for more
[SUCCESS] ✓ All songs loaded (245 songs)
[SUCCESS] ✓ Scrolling complete - found 245 songs
[INFO] Step 4/5: Extracting song elements...
[SUCCESS] ✓ Found 245 liked songs
[INFO] Step 5/5: Extracting song details...
[INFO]   Extracted 50/245 songs...
[INFO]   Extracted 100/245 songs...
[INFO]   Extracted 150/245 songs...
[INFO]   Extracted 200/245 songs...
[SUCCESS] ✓ Extracted 245 songs
[SUCCESS] Scrape likes completed: 245 songs extracted
[INFO] === Saving Results ===
[SUCCESS] Data saved to: data/output/songs.json
[INFO] All flows completed. Press Ctrl+C to close browser.
```

---

### **JSON Output** (`data/output/songs.json`):
```json
{
  "metadata": {
    "scrapedAt": "2026-02-20T12:30:00.000Z",
    "totalSongs": 245,
    "totalPlaylists": 0,
    "totalAlbums": 0,
    "totalArtists": 0
  },
  "likedSongs": [
    {
      "title": "Neighbor (feat. Travis Scott)",
      "artist": "Juicy J",
      "album": "Neighbor (feat. Travis Scott)"
    },
    {
      "title": "Another Song",
      "artist": "Another Artist",
      "album": null
    },
    {
      "title": "Third Song",
      "artist": "Third Artist",
      "album": "Album Name"
    }
  ],
  "playlists": [],
  "albums": [],
  "artists": []
}
```

---

## ⚙️ Configuration

### **Add to `config/config.js`**:

```javascript
module.exports = {
  // ... existing config
  
  scraping: {
    scrollDelay: 2000,        // Wait 2s between scrolls
    maxScrolls: 100,          // Max 100 scroll attempts
    progressInterval: 50,     // Show progress every 50 songs
    scrollStrategy: 'page'    // 'page' or 'container'
  }
}
```

---

## 🚀 Scroll Strategies

### **Strategy 1: Scroll Entire Page** (Default - Recommended)

```javascript
await page.evaluate(() => {
  window.scrollTo(0, document.body.scrollHeight)
})
```

**Pros**:
- ✅ Simple and reliable
- ✅ Works for most layouts
- ✅ No need to find specific container
- ✅ Compatible with fixed headers/sidebars

**When to use**: Default approach, works in most cases

---

### **Strategy 2: Scroll Specific Container** (Alternative)

```javascript
const container = page.locator('.content-scroll-container')
await container.evaluate(el => {
  el.scrollTo(0, el.scrollHeight)
})
```

**Pros**:
- ✅ More targeted (only scrolls songs area)
- ✅ Potentially faster
- ✅ Better for complex layouts

**When to use**: If page scrolling doesn't trigger lazy load

---

## 🎯 Performance Optimizations

### **1. Adaptive Scroll Delay**

```javascript
let scrollDelay = 2000

if (currentCount - previousCount > 50) {
  // Loading fast, reduce delay
  scrollDelay = 1000
} else if (currentCount - previousCount < 10) {
  // Loading slow, increase delay
  scrollDelay = 3000
}
```

**Benefit**: Faster scraping when network is fast, more reliable when slow

---

### **2. Early Exit on Consecutive Empty Scrolls**

```javascript
let emptyScrolls = 0

if (currentCount === previousCount) {
  emptyScrolls++
  if (emptyScrolls >= 3) {
    // 3 consecutive scrolls with no new songs = done
    success('No new songs after 3 scrolls, stopping')
    break
  }
} else {
  emptyScrolls = 0  // Reset counter
}
```

**Benefit**: Exits earlier when all songs are loaded

---

### **3. Batch Text Extraction** (Future Optimization)

```javascript
// Instead of one-by-one extraction
const titles = await page.locator('div.cell-title span').allTextContents()
const artists = await page.locator('div.cell-artist a').allTextContents()
const albums = await page.locator('div.cell-album a').allTextContents()

// Combine into songs array
for (let i = 0; i < titles.length; i++) {
  songs.push({
    title: titles[i].trim(),
    artist: artists[i].trim(),
    album: albums[i]?.trim() || null
  })
}
```

**Benefit**: Much faster for large libraries (1000+ songs)

**Trade-off**: Less granular error handling

---

## ⚠️ Error Handling

### **Possible Failures**

| Failure | Cause | Handling | User Action |
|---------|-------|----------|-------------|
| Likes category not found | Page structure changed | Return error | Update selector |
| No songs visible | Empty library or loading failed | Return error | Check if user has likes |
| Scroll limit reached | Very large library (10k+ songs) | Continue with loaded songs | Increase maxScrolls |
| Individual song extraction fails | Missing element | Skip song, continue | Log warning |
| Album not found | Single track (no album) | Set album to null | Expected behavior |

### **Error Recovery**

1. **Scroll timeout**: If scrolling takes too long, continue with loaded songs
2. **Extraction errors**: Skip individual songs, continue with rest
3. **Save failures**: Log error but don't lose scraped data

---

## 🧪 Testing Checklist

- [ ] Library page is at `/mymusic`
- [ ] "Likes" category is clickable
- [ ] Initial songs load (at least 1)
- [ ] Scrolling loads more songs
- [ ] Scrolling stops when all songs loaded
- [ ] Max scroll limit works (safety)
- [ ] Song titles extracted correctly
- [ ] Artist names extracted correctly
- [ ] Album names extracted (or null)
- [ ] Progress logging works
- [ ] JSON output is valid
- [ ] File is saved to correct location
- [ ] Works with small libraries (< 50 songs)
- [ ] Works with large libraries (500+ songs)

---

## 🎯 Future Enhancements

### **1. Extract Additional Fields**
- Duration
- Track URL
- Album art URL
- Explicit flag
- Release date

### **2. Incremental Scraping**
- Load existing JSON
- Only scrape new songs
- Update existing entries

### **3. Resume on Failure**
- Save progress periodically
- Resume from last saved state
- Useful for very large libraries

### **4. Parallel Extraction**
- Extract multiple songs simultaneously
- Use Promise.all() for batch processing
- Significantly faster for large libraries

---

## 📚 Related Documentation

- `ARCHITECTURE_PLAN.md` - Complete system architecture
- `LOGIN_FLOW_IMPLEMENTATION.md` - Login flow details
- `NAVIGATE_TO_HOME_FLOW_IMPLEMENTATION.md` - Home page navigation
- `SONGS_OPTIONS_FLOW_IMPLEMENTATION.md` - Category extraction

---

**Status**: Ready for implementation  
**Dependencies**: OutputBuilder class (new), existing action blocks  
**Estimated Implementation Time**: 45 minutes  
**Complexity**: Medium (infinite scroll handling)
