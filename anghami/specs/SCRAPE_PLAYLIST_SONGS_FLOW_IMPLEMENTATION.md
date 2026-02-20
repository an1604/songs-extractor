# 📋 Scrape Songs from Playlist Flow - Implementation Plan

## 🎯 Overview
Extract all songs from a single Anghami playlist, handling infinite scroll and storing results with playlist metadata using the `PlaylistCard` model.

---

## 📍 Context & Prerequisites

### **When This Flow Runs**
- After navigating to a specific playlist page
- URL pattern: `https://play.anghami.com/playlist/{playlist_id}`
- Called from the "All Playlists" flow for each discovered playlist

### **Expected Inputs**
- `page` - Playwright page object (already on playlist page)
- `playlistUrl` - The playlist URL or ID
- `outputBuilder` - OutputBuilder instance to store results

### **Expected Outputs**
```javascript
{
  success: true/false,
  message: string,
  playlistCard?: PlaylistCard,
  error?: Error
}
```

---

## 📦 PlaylistCard Model

### **Location**: `src/models/PlaylistCard.js`

### **Class Structure**:
```javascript
class PlaylistCard {
  constructor({ id, name, url, songCount = 0, songs = [], scrapedAt = null }) {
    this.id = id
    this.name = name
    this.url = url
    this.songCount = songCount
    this.songs = songs // Array of SongCard instances
    this.scrapedAt = scrapedAt || new Date().toISOString()
  }

  addSong(songCard) {
    this.songs.push(songCard)
    this.songCount = this.songs.length
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      url: this.url,
      songCount: this.songCount,
      scrapedAt: this.scrapedAt,
      songs: this.songs.map(song => song.toJSON())
    }
  }

  toString() {
    return `${this.name} (${this.songCount} songs)`
  }

  isValid() {
    return Boolean(this.id && this.name && this.url)
  }
}
```

### **Properties**:
- `id` (string, required) - Playlist ID extracted from URL
- `name` (string, required) - Playlist name/title
- `url` (string, required) - Full playlist URL
- `songCount` (number, auto-calculated) - Total number of songs
- `songs` (SongCard[], default: []) - Array of SongCard instances
- `scrapedAt` (string, auto-generated) - ISO timestamp

### **Methods**:
- `addSong(songCard)` - Add a SongCard and update count
- `toJSON()` - Serialize for JSON output
- `toString()` - Human-readable representation
- `isValid()` - Validate required fields

---

## 🔧 Implementation Steps

### **Step 1: Verify Playlist Page is Loaded**
**Purpose**: Ensure we're on the correct playlist page before scraping

**Action Blocks**:
- `waitForElement(page, selector, options)` from `waits.js`

**Implementation**:
1. Wait for URL pattern: `https://play.anghami.com/playlist/*`
2. Wait for the "Play" button to appear:
   - Selector: `button.anghami-default-btn-new.primary.texted:has-text("Play")`
   - Timeout: 10 seconds
3. Log success message

**Success Criteria**: Both URL and Play button are present

**Error Handling**: Return `{ success: false, message: 'Playlist page failed to load' }`

---

### **Step 2: Extract Playlist Metadata & Create PlaylistCard**
**Purpose**: Get playlist metadata and initialize PlaylistCard instance

**Action Blocks**:
- `extractText(page, selector)` from `extraction/text.js`
- `PlaylistCard` class from `models/PlaylistCard.js`

**Implementation**:
1. Extract playlist ID from URL:
   ```javascript
   const url = page.url()
   const idMatch = url.match(/\/playlist\/(\d+)/)
   const playlistId = idMatch ? idMatch[1] : null
   ```

2. Extract playlist name:
   - Try selector: `.view-title` or `h1.view-title` (needs HTML inspection)
   - Fallback: "Unknown Playlist"
   
3. Create PlaylistCard instance:
   ```javascript
   const playlistCard = new PlaylistCard({
     id: playlistId,
     name: playlistName,
     url: url
   })
   ```

4. Validate PlaylistCard:
   ```javascript
   if (!playlistCard.isValid()) {
     return { 
       success: false, 
       message: 'Failed to extract valid playlist metadata' 
     }
   }
   ```

5. Log extracted metadata:
   ```javascript
   log(`Playlist: ${playlistCard.toString()}`)
   ```

**Error Handling**: If ID or name can't be extracted, return failure

---

### **Step 3: Locate Songs Container**
**Purpose**: Find the scrollable container with all songs

**Action Blocks**:
- `waitForElement(page, selector, options)` from `waits.js`

**Implementation**:
1. Wait for songs container to load:
   - Primary selector: `#scroll_window > view-parent > normal-view > div > div.view-content`
   - Fallback selector: `#scroll_window .view-content`
   - Timeout: 10 seconds
   
2. Wait for initial songs to appear:
   - Selector: `a.table-row` (same as liked songs)
   - Ensure at least 1 song is visible
   
3. Log initial song count

**Success Criteria**: Container exists and has at least 1 song

**Error Handling**: If no container found, return success with empty playlist (might be an empty playlist)

---

### **Step 4: Scroll to Load All Songs**
**Purpose**: Handle infinite scroll to load all playlist songs

**Action Blocks**:
- Reuse scrolling logic from `scrapeLikesFlow.js`

**Implementation**:
1. Initialize scroll tracking:
   ```javascript
   let previousCount = 0
   let currentCount = 0
   let scrollAttempts = 0
   const maxScrolls = 100
   const scrollDelay = 2000
   ```

2. Determine scroll container:
   - Primary: `#scroll_window`
   - Fallback: `#base_content`
   - Log which container is being used

3. Scroll loop:
   ```javascript
   while (scrollAttempts < maxScrolls) {
     currentCount = await page.locator('a.table-row').count()
     
     if (currentCount === previousCount && scrollAttempts > 0) {
       success(`✓ All songs loaded (${currentCount} songs)`)
       break
     }
     
     if (scrollAttempts > 0) {
       log(`  Loaded ${currentCount} songs... scrolling for more`)
     }
     
     // Scroll container to bottom
     await scrollContainer.evaluate(el => {
       el.scrollTo(0, el.scrollHeight)
     })
     
     // Scroll last song into view (trigger intersection observer)
     try {
       const lastSong = page.locator('a.table-row').last()
       await lastSong.scrollIntoViewIfNeeded()
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
   ```

4. Log final song count

**Success Criteria**: Song count stops increasing for 2 consecutive checks

---

### **Step 5: Extract All Song Elements**
**Purpose**: Get all song row elements for extraction

**Action Blocks**:
- `page.locator()` (Playwright built-in)

**Implementation**:
1. Get all song rows: 
   ```javascript
   const songRows = await page.locator('a.table-row').all()
   ```
   
2. Validate count:
   ```javascript
   if (songRows.length === 0) {
     log('⚠ Empty playlist - no songs found')
     return { 
       success: true, 
       message: 'Empty playlist', 
       playlistCard: playlistCard 
     }
   }
   ```
   
3. Log total songs found:
   ```javascript
   success(`✓ Found ${songRows.length} songs`)
   ```

**Error Handling**: Empty playlists are valid - return success with empty PlaylistCard

---

### **Step 6: Extract Song Details & Add to PlaylistCard**
**Purpose**: Extract individual song data, create SongCard instances, and add to PlaylistCard

**Action Blocks**:
- `SongCard` class from `models/SongCard.js`
- `playlistCard.addSong()` method

**Implementation**:
```javascript
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
    
    // Extract song URL
    let url = null
    try {
      url = await row.getAttribute('href')
    } catch (err) {
      // URL not available
    }
    
    // Create SongCard
    const songCard = new SongCard({
      title,
      artist,
      album,
      url
    })
    
    // Validate and add to PlaylistCard
    if (songCard.isValid()) {
      playlistCard.addSong(songCard)
      extracted++
    }
    
    // Progress logging (every 50 songs)
    if (extracted % 50 === 0) {
      log(`  Extracted ${extracted}/${songRows.length} songs...`)
    }
    
  } catch (err) {
    error(`Failed to extract song: ${err.message}`)
  }
}

success(`✓ Extracted ${playlistCard.songCount} songs`)
```

**Success Criteria**: At least some songs are successfully extracted and added to PlaylistCard

---

### **Step 7: Store PlaylistCard in Output**
**Purpose**: Add PlaylistCard to output builder

**Action Blocks**:
- `outputBuilder.addPlaylist()` from `output/outputBuilder.js`

**Implementation**:
1. Convert PlaylistCard to JSON:
   ```javascript
   const playlistJSON = playlistCard.toJSON()
   ```

2. Add to output builder:
   ```javascript
   outputBuilder.addPlaylist(playlistJSON)
   ```

3. Log success message:
   ```javascript
   success(`✓ Playlist "${playlistCard.name}" added with ${playlistCard.songCount} songs`)
   ```

4. Return success result:
   ```javascript
   return {
     success: true,
     message: 'Scrape playlist songs completed successfully',
     playlistCard: playlistCard
   }
   ```

---

## 📁 New Files Required

### **1. `src/models/PlaylistCard.js`** (NEW)
PlaylistCard class definition

### **2. `src/flows/scrapePlaylistSongsFlow.js`** (NEW)
Main flow implementation file

### **3. `src/models/SongCard.js`** (EXISTING)
No changes needed - already supports all required fields

### **4. `src/output/outputBuilder.js`** (EXISTING)
Already has `addPlaylist()` method - no changes needed

---

## 🔄 Function Signature

```javascript
async function scrapePlaylistSongsFlow(page, playlistUrl, outputBuilder)
```

**Parameters**:
- `page` - Playwright page object (must be on playlist page)
- `playlistUrl` - The playlist URL (for validation)
- `outputBuilder` - OutputBuilder instance

**Returns**:
```javascript
{
  success: boolean,
  message: string,
  playlistCard?: PlaylistCard,
  error?: Error
}
```

---

## 🎨 Selectors Reference

| Element | Selector | Purpose |
|---------|----------|---------|
| Play Button | `button.anghami-default-btn-new.primary.texted:has-text("Play")` | Verify page loaded |
| Playlist Name | `.view-title` (TBD) | Extract playlist name |
| Songs Container | `#scroll_window > view-parent > normal-view > div > div.view-content` | Main scroll container |
| Song Rows | `a.table-row` | All song elements |
| Song Title | `div.cell-title span` | Song title text |
| Song Artist | `div.cell-artist a` | Artist name |
| Song Album | `div.cell-album a` | Album name |
| Song URL | `a.table-row[href]` | Song page URL |

---

## 🔒 Edge Cases & Error Handling

### **1. Empty Playlist**
- **Detection**: 0 songs after loading
- **Action**: Return success with empty PlaylistCard (songCount = 0)
- **Log**: Warning message "Empty playlist - no songs found"

### **2. Invalid Playlist Metadata**
- **Detection**: Cannot extract ID or name
- **Action**: Return failure immediately
- **Log**: Error message with missing fields

### **3. Private/Restricted Playlist**
- **Detection**: Error loading page or missing Play button
- **Action**: Return failure with descriptive message
- **Log**: Error message

### **4. Slow Network**
- **Detection**: Timeout waiting for elements
- **Action**: Retry with longer timeout (20 seconds)
- **Log**: Warning about slow loading

### **5. Incomplete Song Data**
- **Detection**: Missing title or artist (songCard.isValid() fails)
- **Action**: Skip song but continue with others
- **Log**: Warning with song index

### **6. Infinite Scroll Failure**
- **Detection**: Max scroll attempts reached
- **Action**: Extract whatever songs were loaded
- **Log**: Warning about incomplete extraction

---

## 🧪 Testing Strategy

### **Manual Testing**:
1. Test with small playlist (10-20 songs)
2. Test with large playlist (100+ songs)
3. Test with empty playlist
4. Test with playlist containing songs without albums
5. Test scrolling behavior

### **Validation**:
- PlaylistCard has valid ID, name, and URL
- All songs have title and artist
- Song count matches actual songs array length
- No duplicate songs
- All SongCard and PlaylistCard validations pass

---

## 🔗 Integration with "All Playlists" Flow

This flow will be called from `scrapeAllPlaylistsFlow.js`:

```javascript
// In scrapeAllPlaylistsFlow.js
for (const playlistLink of playlistLinks) {
  await clickElement(page, playlistLink.selector)
  
  const result = await scrapePlaylistSongsFlow(
    page, 
    playlistLink.url, 
    outputBuilder
  )
  
  if (result.success) {
    log(`✓ ${result.playlistCard.toString()}`)
  } else {
    error(`✗ Failed to scrape playlist: ${result.message}`)
  }
  
  // Navigate back to playlists page
  await goBack(page)
}
```

---

## 📊 Expected Output Structure

```json
{
  "metadata": {
    "scrapedAt": "2026-02-20T12:00:00.000Z",
    "totalPlaylists": 1,
    "totalSongs": 1594
  },
  "likedSongs": [
    {
      "title": "Believer",
      "artist": "Imagine Dragons",
      "album": "Evolve",
      "url": "/song/12345678",
      "duration": null,
      "addedAt": "2026-02-20T12:05:31.000Z"
    }
  ],
  "playlists": [
    {
      "id": "8515647",
      "name": "Windows Down, Volume Up",
      "url": "https://play.anghami.com/playlist/8515647",
      "songCount": 94,
      "scrapedAt": "2026-02-20T12:05:30.000Z",
      "songs": [
        {
          "title": "Sugar",
          "artist": "Maroon 5",
          "album": "V",
          "url": "/song/87654321",
          "duration": null,
          "addedAt": "2026-02-20T12:05:32.000Z"
        }
      ]
    }
  ]
}
```

---

## ⚡ Performance Considerations

- **Scrolling**: 2 second delay between scrolls (balance speed vs reliability)
- **Max Scrolls**: 100 attempts (prevents infinite loops on buggy pages)
- **Progress Logging**: Every 50 songs (avoid log spam)
- **Memory**: Process songs in single pass, add directly to PlaylistCard
- **PlaylistCard**: Auto-updates songCount when songs are added

---

## ✅ Success Criteria

1. ✅ PlaylistCard class created with validation
2. ✅ Playlist metadata extracted correctly
3. ✅ All songs loaded via infinite scroll
4. ✅ All songs converted to SongCard format
5. ✅ All songs added to PlaylistCard
6. ✅ PlaylistCard stored in outputBuilder
7. ✅ No errors or clear error messages
8. ✅ Complies with architecture plan (modular, reusable actions)

---

## 📝 Implementation Order

1. Create `src/models/PlaylistCard.js`
2. Create `src/flows/scrapePlaylistSongsFlow.js` - Step 1 (verify page loaded)
3. Implement Step 2 (extract metadata & create PlaylistCard)
4. Implement Step 3 (locate songs container)
5. Implement Step 4 (scroll to load all songs)
6. Implement Step 5 (extract song elements)
7. Implement Step 6 (extract song details & add to PlaylistCard)
8. Implement Step 7 (store PlaylistCard in output)
9. Test with sample playlists
10. Integrate with "All Playlists" flow

---

**Status**: Ready for implementation
**Dependencies**: SongCard, OutputBuilder, Action blocks (navigation, clicks, waits)
**Last Updated**: 2026-02-20
