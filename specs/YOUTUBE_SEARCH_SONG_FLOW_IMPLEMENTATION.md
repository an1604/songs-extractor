# YouTube Search Song Flow - Implementation Plan

## 📋 Flow Definition Reference

**Source**: `anghami/flows/youtube_flows/search_song.txt`

**Steps**:
1. Run "login" (prerequisite - caller ensures user is logged in)
2. Locate search bar and submit button
3. Hit the search (fill query and submit)
4. Validation: occurrence of search results elements on screen

---

## 🏗️ Architecture Alignment

- **YOUTUBE_TRANSFER_IMPLEMENTATION_PLAN.md**: Phase 3 (Search Song Flow)
- **ARCHITECTURE_PLAN.md**: Reuse existing action blocks (navigation, clicks, waits)

---

## 📁 File Location

`src/flows/youtube/youtubeSearchSongFlow.js`

---

## 🔧 Function Signature

```javascript
async function searchSongFlow(page, searchQuery)
```

**Parameters**:
- `page` - Playwright page object (must be on YouTube, logged in)
- `searchQuery` - String to search (e.g. `"${songTitle} ${songArtist}"`)

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

### **Step 1: Ensure on YouTube**

**Action**: Navigate if needed

**Implementation**:
- Check if current URL is `youtube.com`
- If not, navigate to `config.urls.youtube.base`
- Optional: skip if already on YouTube

**Alternative**: Use URL-based search - `page.goto(config.urls.youtube.search + encodeURIComponent(query))` - simpler and more reliable than UI interaction

---

### **Step 2: Wait for Search Bar**

**Action**: `waitForElement(page, selector)`

**Selectors** (from flow definition):
- Primary: `input[name="search_query"]`
- Fallback: `input.ytSearchboxComponentInput` or `input.yt-searchbox-input`

**Implementation**:
```javascript
await waitForElement(page, 'input[name="search_query"]', {
  timeout: 10000,
  state: 'visible'
})
```

**Expected result**: Search input is visible and ready for input

---

### **Step 3: Fill Search Query**

**Action**: `page.locator(selector).fill(value)` or `page.fill(selector, value)`

**Implementation**:
```javascript
const searchInput = page.locator('input[name="search_query"]')
await searchInput.fill(searchQuery)
```

**Expected result**: Search input contains the query text

---

### **Step 4: Submit Search**

**Action**: Click search button or press Enter

**Option A - Click Search Button**:
- Selector: `button[aria-label="Search"]` or `.ytSearchboxComponentSearchButton`
- `await clickElement(page, 'button[aria-label="Search"]')`

**Option B - Press Enter**:
- `await searchInput.press('Enter')`

**Implementation**:
- Prefer Enter (simpler, no need to locate button)
- Wait for navigation to results page

**Expected result**: Page navigates to results URL (`/results?search_query=...`)

---

### **Step 5: Validate Results Loaded**

**Action**: `waitForElement(page, selector)`

**Selectors** (from flow definition):
- `yt-chip-cloud-chip-renderer` - Filter chips (All, Videos, etc.)
- `#contents` - Results container
- `ytd-video-renderer` - Video items

**Implementation**:
```javascript
await waitForElement(page, 'yt-chip-cloud-chip-renderer, #contents, ytd-video-renderer', {
  timeout: 10000,
  state: 'visible'
})
```

**Expected result**: Search results are visible on screen

---

## 🎨 Selectors Reference

| Element | Selector | Source | Notes |
|---------|----------|--------|-------|
| Search input | `input[name="search_query"]` | search_song.txt | Primary |
| Search input | `input.ytSearchboxComponentInput` | search_song.txt | Fallback |
| Search form | `form.ytSearchboxComponentSearchForm` | search_song.txt | Parent |
| Search button | `button[aria-label="Search"]` | search_song.txt | Submit |
| Search button | `.ytSearchboxComponentSearchButton` | search_song.txt | Alternative |
| Filter chips | `yt-chip-cloud-chip-renderer` | search_song.txt | Validation |
| Results container | `#contents` | search_song.txt | Validation |
| Video items | `ytd-video-renderer` | search_song.txt | Validation |

---

## 📦 Dependencies

- `waitForElement` from `actions/waits.js`
- `clickElement` from `actions/clicks.js`
- `goTo` from `actions/navigation.js` (if navigation needed)
- `config.urls.youtube.base`, `config.urls.youtube.search`
- `log`, `success`, `error` from `utils/logger.js`

---

## ⚠️ Error Handling

| Case | Handling |
|------|----------|
| Search bar not found | Return failure with message |
| Submit fails | Return failure (retry via action block) |
| Search returns no results | Return failure (no videos for query) |
| Validation timeout | Return failure with timeout message |

---

## 🔄 Design Decisions

1. **Login**: Caller is responsible - flow assumes user is already logged in
2. **Navigation**: Only navigate if not on YouTube; otherwise use current page
3. **Validation**: Use `yt-chip-cloud-chip-renderer` OR `#contents` as success indicator
4. **URL**: After submit, URL should be `youtube.com/results?search_query=...`

---

## 📝 Implementation Order

1. Wait for search input
2. Fill search query
3. Submit (click button or Enter)
4. Wait for results validation
5. Return success/failure

---

## 🔗 Usage Example

```javascript
// In addSongToLikesFlow or getSongPageFlow
const searchResult = await searchSongFlow(page, `${song.title} ${song.artist}`)
if (!searchResult.success) {
  return { success: false, message: `Search failed for "${song.title}"` }
}
```

---

## ❓ Open Items

1. **Search bar visibility**: On some YouTube layouts, search may need to be clicked first to expand
2. **URL-based search**: Alternative approach - `page.goto(config.urls.youtube.search + encodeURIComponent(query))` - simpler and more reliable than UI interaction
3. **Results validation**: Prefer `#contents` with `ytd-video-renderer` for robustness (filter chips may not always appear)

---

## 📊 Expected Console Output

```
[INFO] Searching for: Believer Imagine Dragons
[SUCCESS] ✓ Search input found
[SUCCESS] ✓ Search submitted
[SUCCESS] ✓ Search results loaded
```

---

**Status**: Ready for implementation
**Dependencies**: executeYouTubeLoginFlow (caller), Action blocks
**Last Updated**: 2026-02-20
