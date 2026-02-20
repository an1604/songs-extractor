# Anghami Scraper - Complete Architecture Plan

## 🎯 Overview
Modular, block-based Playwright scraper for extracting songs from Anghami with clean, maintainable architecture.

---

## 🏗️ Project Structure

```
anghami/
├── flows/
│   ├── login.txt              # Flow definitions (human-readable)
│   └── getSongs.txt            # Future flow definitions
│
├── specs/                     # Documentation
│   ├── ARCHITECTURE_PLAN.md   # This file
│   └── LOGIN_FLOW_IMPLEMENTATION.md
│
├── src/
│   ├── actions/               # Atomic action blocks with retry logic
│   │   ├── navigation.js      # Page navigation actions
│   │   ├── clicks.js          # Click actions
│   │   ├── waits.js           # Wait actions
│   │   ├── extraction/        # Data extraction actions (separated)
│   │   │   ├── text.js        # Text extraction
│   │   │   ├── attributes.js  # Attribute extraction
│   │   │   ├── lists.js       # List/multiple items extraction
│   │   │   └── complex.js     # Complex data structures
│   │   └── index.js           # Export all actions
│   │
│   ├── flows/                 # Flow executors (orchestration)
│   │   ├── loginFlow.js       # Login flow implementation
│   │   ├── likedSongsFlow.js  # Future: Liked songs scraper
│   │   └── playlistsFlow.js   # Future: Playlists scraper
│   │
│   ├── browser/               # Browser management
│   │   ├── browserManager.js  # Browser lifecycle
│   │   └── sessionManager.js  # Cookie/session handling
│   │
│   ├── output/                # JSON output builders
│   │   └── outputBuilder.js   # Structured JSON builder
│   │
│   ├── utils/                 # Utilities
│   │   ├── retry.js           # Retry logic wrapper
│   │   ├── logger.js          # Logging utility
│   │   └── fileSystem.js      # File operations
│   │
│   └── index.js               # Entry point
│
├── config/
│   └── config.js              # Configuration (URLs, timeouts, retry)
│
├── data/                      # Runtime data storage
│   ├── session/
│   │   └── cookies.json       # Saved login session
│   └── output/
│       └── songs.json         # Final structured output
│
├── package.json
└── .gitignore
```

---

## 📦 Module Descriptions

### **1. Actions Layer** (`src/actions/`)
**Purpose**: Reusable atomic operations - the building blocks

#### **navigation.js**
- `goTo(page, url, options)` - Navigate to URL with retry
- `reload(page)` - Reload current page
- `goBack(page)` - Navigate back

#### **clicks.js**
- `clickElement(page, selector, options)` - Click element with retry
- `doubleClick(page, selector)` - Double click element
- `rightClick(page, selector)` - Right click element

#### **waits.js**
- `waitForElement(page, selector, options)` - Wait for element to appear
- `waitForText(page, text, options)` - Wait for text content
- `waitForNavigation(page)` - Wait for page navigation
- `waitForTimeout(ms)` - Simple timeout wait

#### **extraction/** (Separated scraping actions)

##### **extraction/text.js**
- `extractText(page, selector)` - Extract single text
- `extractAllText(page, selector)` - Extract all matching texts
- `extractInnerHTML(page, selector)` - Extract HTML content

##### **extraction/attributes.js**
- `extractAttribute(page, selector, attribute)` - Extract single attribute
- `extractAllAttributes(page, selector, attribute)` - Extract multiple attributes
- `extractDataset(page, selector)` - Extract data-* attributes

##### **extraction/lists.js**
- `extractList(page, selector)` - Extract list items
- `extractTable(page, selector)` - Extract table data
- `extractMultiple(page, config)` - Extract structured data from multiple elements

##### **extraction/complex.js**
- `extractWithFields(page, config)` - Extract complex objects
- `extractNested(page, config)` - Extract nested structures
- `extractPaginated(page, config)` - Handle paginated data

**All actions include**:
- Automatic retry (3 attempts default)
- Exponential backoff
- Clear error messages
- Return `{ success: true/false, data?, error? }`

---

### **2. Browser Layer** (`src/browser/`)

#### **browserManager.js**
```javascript
- launchBrowser(options)        // Launch Playwright browser
- createContext(browser, options) // Create browser context
- createPage(context)           // Create new page
- closeBrowser(browser)         // Clean shutdown
```

#### **sessionManager.js**
```javascript
- saveSession(context, filepath)    // Save cookies after login
- loadSession(context, filepath)    // Load saved cookies
- isSessionValid(page)              // Check if still logged in
- clearSession(filepath)            // Delete saved cookies
```

**Session Flow**:
1. Try to load saved cookies
2. If valid → Skip login
3. If invalid → Run login flow → Save cookies
4. Reuse session for future runs

---

### **3. Flows Layer** (`src/flows/`)
**Purpose**: Orchestrate action blocks into complete workflows

#### **loginFlow.js**
```javascript
async function executeLoginFlow(page) {
  // Step-by-step orchestration using action blocks
  // Maps directly to login.txt flow definition
  // See LOGIN_FLOW_IMPLEMENTATION.md for details
}
```

#### **Future Flows**
- `likedSongsFlow.js` - Scrape liked songs
- `playlistsFlow.js` - Scrape playlists
- `albumsFlow.js` - Scrape albums

**Design principle**: Flows read like plain English, no complex logic

---

### **4. Output Layer** (`src/output/`)

#### **outputBuilder.js**
```javascript
class OutputBuilder {
  constructor()                    // Initialize with empty structure
  addLikedSong(song)              // Add to likedSongs section
  addPlaylist(playlist)           // Add to playlists section
  addAlbum(album)                 // Add to albums section
  addArtist(artist)               // Add to artists section
  updateMetadata()                // Update counts and timestamps
  save(filepath)                  // Write to JSON file
  load(filepath)                  // Load existing output
}
```

**Output Structure**:
```json
{
  "metadata": {
    "scrapedAt": "2026-02-20T10:30:00Z",
    "totalSongs": 456,
    "totalPlaylists": 8,
    "totalAlbums": 23
  },
  "likedSongs": [
    {
      "title": "Song Title",
      "artist": "Artist Name",
      "album": "Album Name",
      "duration": "3:45",
      "url": "https://..."
    }
  ],
  "playlists": [
    {
      "name": "Playlist Name",
      "createdAt": "2025-01-15",
      "songCount": 42,
      "songs": [...]
    }
  ],
  "albums": [...],
  "artists": [...]
}
```

---

### **5. Utils Layer** (`src/utils/`)

#### **retry.js**
```javascript
async function withRetry(fn, options) {
  // Generic retry wrapper
  // Used by all action blocks
  // Exponential backoff
}
```

#### **logger.js**
```javascript
- log(message)      // Info logging
- error(message)    // Error logging
- success(message)  // Success logging
- debug(message)    // Debug logging
```

#### **fileSystem.js**
```javascript
- readJSON(filepath)
- writeJSON(filepath, data)
- ensureDir(dirpath)
- fileExists(filepath)
```

---

### **6. Config Layer** (`config/config.js`)

```javascript
module.exports = {
  urls: {
    base: 'https://www.anghami.com/',
    likedSongs: 'https://www.anghami.com/library/songs',
    playlists: 'https://www.anghami.com/library/playlists',
    albums: 'https://www.anghami.com/library/albums'
  },
  
  retry: {
    maxAttempts: 3,
    initialDelay: 1000,
    backoffMultiplier: 2,
    maxDelay: 10000
  },
  
  timeouts: {
    navigation: 30000,
    element: 10000,
    click: 5000
  },
  
  browser: {
    headless: false,
    slowMo: 50,
    viewport: { width: 1280, height: 720 }
  },
  
  paths: {
    cookies: 'data/session/cookies.json',
    output: 'data/output/songs.json'
  }
}
```

---

## 🔄 Complete Execution Flow

```javascript
// src/index.js
async function main() {
  const browser = await launchBrowser()
  const context = await createContext(browser)
  const page = await createPage(context)
  const output = new OutputBuilder()

  try {
    // === SESSION MANAGEMENT ===
    const hasSession = await loadSession(context, config.paths.cookies)
    
    if (!hasSession || !await isSessionValid(page)) {
      log('No valid session, logging in...')
      await executeLoginFlow(page)
      await saveSession(context, config.paths.cookies)
      success('Login successful, session saved')
    } else {
      success('Using saved session')
    }

    // === DATA SCRAPING (Future) ===
    log('Scraping liked songs...')
    await getLikedSongsFlow(page, output)
    
    log('Scraping playlists...')
    await getPlaylistsFlow(page, output)
    
    // === SAVE OUTPUT ===
    await output.save(config.paths.output)
    success(`Data saved to: ${config.paths.output}`)

  } catch (error) {
    error('Scraping failed:', error.message)
    throw error
  } finally {
    await closeBrowser(browser)
  }
}

main().catch(console.error)
```

---

## ✅ Design Principles

### **1. Modularity**
- Each module has one clear responsibility
- No circular dependencies
- Easy to test in isolation

### **2. Readability**
- Function names are self-documenting
- No comments needed (code explains itself)
- Flows read like plain English

### **3. Maintainability**
- Change one action, all flows benefit
- Add new flows without touching existing code
- Centralized configuration

### **4. Reliability**
- Every action has retry logic
- Exponential backoff prevents hammering
- Clear error messages

### **5. Extensibility**
- Add new actions to `src/actions/`
- Add new flows to `src/flows/`
- Add new output sections to `outputBuilder`

---

## 🎯 Adding New Flows

### **Example: Adding "Albums" Flow**

1. **Create flow file**: `src/flows/albumsFlow.js`
```javascript
const { goTo, clickElement, waitForElement } = require('../actions')
const { extractMultiple } = require('../actions/extraction/lists')

async function getAlbumsFlow(page, outputBuilder) {
  await goTo(page, config.urls.albums)
  await waitForElement(page, '.album-list')
  
  const albums = await extractMultiple(page, {
    selector: '.album-item',
    fields: {
      title: '.album-title',
      artist: '.album-artist',
      year: '.album-year'
    }
  })
  
  albums.forEach(album => outputBuilder.addAlbum(album))
  return albums
}

module.exports = { getAlbumsFlow }
```

2. **Add to main execution**: Update `src/index.js`
```javascript
const { getAlbumsFlow } = require('./flows/albumsFlow')

// In main():
await getAlbumsFlow(page, output)
```

3. **Done!** All infrastructure (retry, session, output) already works

---

## 🚀 Development Workflow

### **Phase 1: Foundation** (Current)
1. ✅ Setup project structure
2. ✅ Implement action blocks (navigation, clicks, waits, extraction)
3. ✅ Implement browser manager
4. ✅ Implement session manager
5. ✅ Implement login flow
6. ✅ Test login flow manually

### **Phase 2: Data Scraping** (Future)
1. Analyze Anghami's liked songs page structure
2. Implement `likedSongsFlow.js`
3. Implement `playlistsFlow.js`
4. Test data extraction

### **Phase 3: Enhancement** (Future)
1. Add progress bars
2. Add rate limiting
3. Add incremental scraping (only new songs)
4. Add error recovery (resume from failure)

---

## 🛠️ Technology Stack

- **Runtime**: Node.js
- **Browser Automation**: Playwright
- **Language**: JavaScript (ES6+)
- **Data Format**: JSON
- **Session Storage**: JSON files (cookies)

---

## 📝 Notes

- **No TypeScript**: Keep it simple with JavaScript
- **No Database**: JSON files for now (can migrate later)
- **No UI**: CLI-based for simplicity
- **Manual Flows**: No auto-parsing of `.txt` files (clearer, easier to debug)

---

## 🔒 Security Considerations

- **Cookies**: Stored locally in `data/session/` (add to `.gitignore`)
- **Credentials**: Never store passwords (QR code login only)
- **Rate Limiting**: Built into retry logic
- **User Agent**: Use Playwright's default (looks like real browser)

---

## 📚 Documentation Files

- `ARCHITECTURE_PLAN.md` - This file (complete architecture)
- `LOGIN_FLOW_IMPLEMENTATION.md` - Detailed login flow implementation steps

---

**Status**: Ready for implementation
**Last Updated**: 2026-02-20
