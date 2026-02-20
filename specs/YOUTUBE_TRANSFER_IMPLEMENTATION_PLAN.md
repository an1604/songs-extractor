# YouTube Transfer - Implementation Plan

## 🎯 Overview

Transfer all songs from the Anghami JSON output to YouTube Music by:
1. Logging into YouTube
2. Loading songs from `songs.json`
3. For each song: search → open video page → click Like

---

## 📐 Architecture Alignment

### **Extended Project Structure**

```
anghami/
├── flows/
│   ├── anghami_flows/           # Existing Anghami flows
│   └── youtube_flows/           # YouTube flow definitions
│       ├── login.txt
│       ├── search_song.txt
│       ├── add_song_to_likes.txt
│       └── add_all_songs_to_likes.txt
│
├── src/
│   ├── actions/                 # Shared (reused)
│   │   ├── navigation.js
│   │   ├── clicks.js
│   │   ├── waits.js
│   │   └── scrolling.js
│   │
│   ├── flows/
│   │   ├── youtube/             # NEW: YouTube flow executors
│   │   │   ├── youtubeLoginFlow.js
│   │   │   ├── youtubeSearchSongFlow.js
│   │   │   ├── youtubeGetSongPageFlow.js
│   │   │   ├── youtubeAddSongToLikesFlow.js
│   │   │   └── youtubeAddAllSongsToLikesFlow.js
│   │   ├── loginFlow.js         # Anghami
│   │   ├── scrapeLikesFlow.js   # Anghami
│   │   └── ...
│   │
│   └── browser/
│       └── sessionManager.js    # Extend for YouTube session
│
├── config/
│   └── config.js                # Add YouTube URLs & paths
│
└── data/
    ├── session/
    │   ├── cookies.json         # Anghami
    │   └── youtube_cookies.json # NEW: YouTube session
    └── output/
        └── songs.json
```

---

## 🔗 Flow Dependencies

```
add_all_songs_to_likes
    └── add_song_to_likes
            └── search_song
            └── get_song_container
            └── get_song_page
                    └── search_song
                    └── get_song_container
            └── click like button
```

---

## 🔧 Implementation Steps

### **Phase 1: Configuration & Session**

#### **1.1 Update `config/config.js`**

Add YouTube configuration:

```javascript
urls: {
  // Existing Anghami
  base: 'https://play.anghami.com/',
  // ...
  
  // NEW: YouTube
  youtube: {
    base: 'https://www.youtube.com/',
    search: 'https://www.youtube.com/results?search_query='
  }
},

paths: {
  cookies: 'data/session/cookies.json',
  youtubeCookies: 'data/session/youtube_cookies.json',  // NEW
  output: 'data/output/songs.json'
}
```

#### **1.2 Extend Session Manager for YouTube**

- Add `saveYouTubeSession(context, filepath)`
- Add `loadYouTubeSession(context, filepath)`
- Add `isYouTubeSessionValid(page)` - check for `#avatar-btn` presence

---

### **Phase 2: YouTube Login Flow**

**File**: `src/flows/youtube/youtubeLoginFlow.js`  
**Source**: `flows/youtube_flows/login.txt`

**Steps**:
1. Navigate to `https://www.youtube.com/`
2. Click Sign In button (selector TBD - `yt-touch-feedback-shape` is child element; need parent)
3. Wait for Google sign-in redirect (user completes OAuth manually)
4. Wait for logged-in state: `#avatar-btn` (avatar button) to appear
5. Save session: `saveYouTubeSession(context, config.paths.youtubeCookies)`

**Return**: `{ success, message, error? }`

**Note**: YouTube uses Google OAuth - user will manually complete sign-in in browser. Flow just waits for completion.

---

### **Phase 3: Search Song Flow**

**File**: `src/flows/youtube/youtubeSearchSongFlow.js`  
**Source**: `flows/youtube_flows/search_song.txt`

**Function**: `searchSongFlow(page, searchQuery)`

**Steps**:
1. Navigate to `https://www.youtube.com/` (if not already there)
2. Wait for search bar: `input.ytSearchboxComponentInput` or `input[name="search_query"]`
3. Fill search query: `"${songTitle} ${songArtist}"`
4. Submit search (click search button or press Enter)
   - Search button: `button[aria-label="Search"]` or `.ytSearchboxComponentSearchButton`
5. Wait for results container: `#contents` with `ytd-video-renderer` or `yt-chip-cloud-chip-renderer`
6. Return success/failure

**Return**: `{ success, message, error? }`

---

### **Phase 4: Get Song Container Flow**

**File**: `src/flows/youtube/youtubeGetSongContainerFlow.js`  
**Source**: `flows/youtube_flows/get_song_container.txt` (incomplete)

**Function**: `getSongContainerFlow(page)`

**Steps**:
1. Assumes search has already been run
2. Wait for results container: `#contents` or `ytd-item-section-renderer #contents`
3. Return container locator or success

**Return**: `{ success, container?, error? }`

---

### **Phase 5: Get Song Page Flow**

**File**: `src/flows/youtube/youtubeGetSongPageFlow.js`  
**Source**: `flows/youtube_flows/get_song_page.txt`

**Function**: `getSongPageFlow(page, song)`

**Steps**:
1. Call `searchSongFlow(page, "${song.title} ${song.artist}")`
2. Call `getSongContainerFlow(page)`
3. Click first video: `#contents > ytd-video-renderer:nth-child(1)` or `ytd-video-renderer:first-child`
4. Wait for watch page: `#title h1` or `ytd-watch-metadata h1`
5. Validate: title contains song name (fuzzy match)
6. Return success/failure

**Return**: `{ success, message, error? }`

---

### **Phase 6: Add Song to Likes Flow**

**File**: `src/flows/youtube/youtubeAddSongToLikesFlow.js`  
**Source**: `flows/youtube_flows/add_song_to_likes.txt`

**Function**: `addSongToLikesFlow(page, song)`

**Steps**:
1. Call `getSongPageFlow(page, song)` (which includes search + container + click first result)
2. Wait for like button: `#top-level-buttons-computed` or `ytd-menu-renderer` like button
   - Common selector: `button[aria-label*="like"]` or `#like-button`
3. Check if already liked (aria-pressed or similar)
4. If not liked, click like button
5. Return success/failure

**Return**: `{ success, message, alreadyLiked?, error? }`

---

### **Phase 7: Add All Songs to Likes Flow**

**File**: `src/flows/youtube/youtubeAddAllSongsToLikesFlow.js`  
**Source**: `flows/youtube_flows/add_all_songs_to_likes.txt`

**Function**: `addAllSongsToLikesFlow(page, songs, options)`

**Steps**:
1. Load songs from JSON:
   - Use `OutputBuilder.load()` or `fs.readFile` + `JSON.parse`
   - Extract `data.likedSongs` (and optionally `data.playlists[].songs`)
2. Iterate over songs:
   - Call `addSongToLikesFlow(page, song)`
   - Log progress (e.g., every 10 songs)
   - Optional delay between songs (2-3 seconds) to avoid rate limiting
3. Track stats: success count, failed count, skipped (already liked)
4. Return summary

**Return**: `{ success, totalProcessed, added, failed, skipped, errors[] }`

---

### **Phase 8: Entry Point**

**Option A**: New script `src/youtubeTransfer.js`

```javascript
// Load songs from JSON
// Load/create browser
// Load YouTube session or run YouTube login
// Run addAllSongsToLikesFlow
// Save session
// Log summary
```

**Option B**: Add mode to `src/index.js`

```javascript
// npm start              → Anghami scraping
// npm run youtube:transfer → YouTube transfer
```

---

## 🎨 Selectors Reference (from flow files)

| Element | Selector | Notes |
|---------|----------|-------|
| Sign in button | TBD | `yt-touch-feedback-shape` is child; need parent button/link |
| Avatar (logged in) | `#avatar-btn` | `button[aria-label="Account menu"]` |
| Search input | `input.ytSearchboxComponentInput` | or `input[name="search_query"]` |
| Search button | `button[aria-label="Search"]` | or `.ytSearchboxComponentSearchButton` |
| Search results | `#contents` | `ytd-video-renderer` |
| First video | `#contents > ytd-video-renderer:nth-child(1)` | |
| Video title | `#title h1` | or `ytd-watch-metadata h1` |
| Like button | `button[aria-label*="like"]` | or `#like-button` |

---

## 🔒 Edge Cases & Error Handling

| Case | Handling |
|------|----------|
| Song not found | Log and skip; continue with next song |
| Multiple matches | Use first result; optionally validate title similarity |
| Already liked | Skip; count as `skipped` |
| Rate limiting | Add delay between songs; optional exponential backoff |
| Session expired | Re-run login flow; retry failed song |
| Invalid JSON | Fail early with clear error |
| Empty song list | Return success with 0 processed |

---

## ⚡ Performance & Safety

- **Delay between songs**: 2-3 seconds (avoid rate limiting)
- **Batch processing**: Optional - process in batches with longer pauses
- **Resume capability**: Optional - save progress, resume from last failed index
- **Failed songs log**: Save list of failed songs for manual retry

---

## 📝 Implementation Order

1. Config: Add YouTube URLs and paths
2. Session: Add YouTube session save/load/validation
3. `youtubeLoginFlow.js`
4. `youtubeSearchSongFlow.js`
5. `youtubeGetSongContainerFlow.js`
6. `youtubeGetSongPageFlow.js`
7. `youtubeAddSongToLikesFlow.js`
8. `youtubeAddAllSongsToLikesFlow.js`
9. Entry point: `youtubeTransfer.js` or npm script
10. End-to-end testing

---

## ❓ Open Questions

1. **Sign-in selector**: The `login.txt` references `yt-touch-feedback-shape` - need to verify actual Sign In button selector (may require live page inspection)
2. **Song source**: Use only `likedSongs` from JSON, or also include songs from `playlists`?
3. **Duplicate handling**: Skip if already in YouTube likes, or always attempt to like?
4. **Rate limiting**: Preferred delay between songs (2s, 3s, 5s)?

---

**Status**: Ready for implementation
**Dependencies**: Existing actions (navigation, clicks, waits), OutputBuilder.load()
**Last Updated**: 2026-02-20
