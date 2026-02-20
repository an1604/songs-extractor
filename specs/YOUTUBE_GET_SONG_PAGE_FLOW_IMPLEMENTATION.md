# YouTube Get Song Page Flow - Implementation Plan

## 📋 Flow Definition Reference

**Source**: `anghami/flows/youtube_flows/get_song_page.txt`

**Steps**:
1. Run "search a song flow"
2. Run "Get song container"
3. Select the 1st song and click it
   - Selector: `#contents > ytd-video-renderer:nth-child(1)`
   - Xpath: `//*[@id="contents"]/ytd-video-renderer[1]`
4. Validation: header with the song name appears
   - Selector: `#title > h1`
   - Xpath: `/html/body/ytd-app/div[1]/ytd-page-manager/ytd-watch-flexy/div[4]/div[1]/div/div[2]/ytd-watch-metadata/div/div[1]/h1`
   - Check if the song's name is included in the content of this element

---

## 🏗️ Architecture Alignment

- **YOUTUBE_TRANSFER_IMPLEMENTATION_PLAN.md**: Phase 5 (Get Song Page Flow)
- **Flow dependencies**: `getSongPageFlow` → `searchSongFlow` → `getSongContainerFlow`
- **ARCHITECTURE_PLAN.md**: Reuse existing action blocks (navigation, clicks, waits)

---

## 📁 File Location

`src/flows/youtube/youtubeGetSongPageFlow.js`

---

## 🔧 Function Signature

```javascript
async function getSongPageFlow(page, song)
```

**Parameters**:
- `page` - Playwright page object (must be on YouTube, logged in)
- `song` - Object with `title` and `artist` (e.g. `{ title: "Believer", artist: "Imagine Dragons" }`)

**Returns**:
```javascript
{
  success: boolean,
  message: string,
  error?: Error
}
```

---

## 📝 Step-by-Step Implementation

### **Step 1: Run Search Song Flow**

**Action**: Call `searchSongFlow(page, searchQuery)`

**Implementation**:
```javascript
const searchQuery = `${song.title} ${song.artist}`
const searchResult = await searchSongFlow(page, searchQuery)
if (!searchResult.success) {
  return { success: false, message: `Search failed for "${song.title}"`, error: searchResult.error }
}
```

**Expected result**: Page is on search results (`/results?search_query=...`)

---

### **Step 2: Run Get Song Container Flow**

**Action**: Call `getSongContainerFlow(page)`

**Implementation**:
```javascript
const containerResult = await getSongContainerFlow(page)
if (!containerResult.success) {
  return { success: false, message: `No results for "${song.title}"`, error: containerResult.error }
}
```

**Expected result**: Container locator for search results `#contents`

---

### **Step 3: Click First Video**

**Action**: Click the first video in the container

**Selectors** (from flow definition):
- Primary: `#contents > ytd-video-renderer:nth-child(1)`
- Alternative: `ytd-video-renderer` inside container

**Implementation**:
```javascript
const firstVideoLocator = containerResult.container.locator('ytd-video-renderer').first()
await firstVideoLocator.click()
```

**Alternative** (page-level selector):
```javascript
await clickElement(page, '#contents > ytd-video-renderer:nth-child(1)')
```
Note: `#contents` may match multiple elements on page; prefer using container from `getSongContainerFlow`.

**Expected result**: Navigation to watch page (`/watch?v=...`)

---

### **Step 4: Validate Watch Page & Song Title**

**Action**: Wait for title header and verify it contains the song name

**Selectors** (from flow definition):
- Primary: `#title > h1`
- Alternative: `ytd-watch-metadata h1`

**Implementation**:
```javascript
const titleResult = await waitForElement(page, '#title h1, ytd-watch-metadata h1', {
  timeout: 10000,
  state: 'visible',
  first: true
})
if (!titleResult.success) {
  return { success: false, message: 'Watch page title not found', error: titleResult.error }
}

const titleElement = page.locator('#title h1, ytd-watch-metadata h1').first()
const titleText = await titleElement.textContent()
const songTitleLower = song.title.toLowerCase().trim()
const titleTextLower = titleText.toLowerCase()

if (!titleTextLower.includes(songTitleLower)) {
  return { success: false, message: `Title mismatch: expected "${song.title}" in "${titleText}"` }
}
```

**Expected result**: Watch page loaded and h1 contains song title (case-insensitive)

---

## 🎨 Selectors Reference

| Element | Selector | Notes |
|---------|----------|-------|
| First video | `#contents > ytd-video-renderer:nth-child(1)` | From flow definition |
| First video (in container) | `container.locator('ytd-video-renderer').first()` | When using container |
| Watch page title | `#title > h1` | From flow definition |
| Watch page title | `ytd-watch-metadata h1` | Alternative |

---

## 📦 Dependencies

- `searchSongFlow` from `flows/youtube/youtubeSearchSongFlow.js`
- `getSongContainerFlow` from `flows/youtube/youtubeGetSongContainerFlow.js`
- `waitForElement` from `actions/waits.js`
- `clickElement` from `actions/clicks.js` (optional, if not using container locator)
- `log`, `success`, `error` from `utils/logger.js`

---

## ⚠️ Error Handling

| Case | Handling |
|------|----------|
| Search fails | Return failure with message |
| No container / no results | Return failure |
| First video click fails | Return failure (retry via action block) |
| Watch page title not found | Return failure |
| Title mismatch | Return failure with expected vs actual |

---

## 🔄 Design Decisions

1. **Search query**: Use `"${song.title} ${song.artist}"`
2. **First video**: Use `container.locator('ytd-video-renderer').first()` to avoid multiple `#contents` matches
3. **Validation**: Case-insensitive `includes` for song title in h1
4. **Fuzzy matching**: Start with exact substring; can add normalization later (punctuation, "Official Video", etc.)

---

## 📝 Implementation Order

1. Call `searchSongFlow(page, searchQuery)`
2. Call `getSongContainerFlow(page)`
3. Click first video in container
4. Wait for watch page title element
5. Validate title contains song name
6. Return success/failure

---

## 🔗 Usage Example

```javascript
// In addSongToLikesFlow
const pageResult = await getSongPageFlow(page, { title: 'Believer', artist: 'Imagine Dragons' })
if (!pageResult.success) {
  return { success: false, message: pageResult.message }
}
// Now on watch page, proceed to click like button
```

---

## ❓ Open Items

1. **Fuzzy matching**: How strict should title validation be? (punctuation, "Official Video", etc.)
2. **Wait for navigation**: Add `page.waitForURL(/\/watch\?v=/)` after click?
3. **Wrong video**: If title doesn't match, retry with 2nd result or fail?

---

## 📊 Expected Console Output

```
[INFO] Step 1/4: Searching for song...
[SUCCESS] ✓ Search completed
[INFO] Step 2/4: Getting song container...
[SUCCESS] ✓ Container located
[INFO] Step 3/4: Clicking first video...
[SUCCESS] ✓ Navigated to watch page
[INFO] Step 4/4: Validating title...
[SUCCESS] ✓ Title matches: Believer
```

---

**Status**: Ready for implementation
**Dependencies**: searchSongFlow, getSongContainerFlow, Action blocks
**Last Updated**: 2026-02-20
