# YouTube Get Song Container Flow - Implementation Plan

## 📋 Flow Definition Reference

**Source**: `anghami/flows/youtube_flows/get_song_container.txt` *(incomplete - cuts off at "locate the foll")*

**Steps** (inferred from file + transfer plan):
1. Run "search a song flow" (prerequisite - caller runs `searchSongFlow` first)
2. Locate the video results container (and first video element)

---

## 🏗️ Architecture Alignment

- **YOUTUBE_TRANSFER_IMPLEMENTATION_PLAN.md**: Phase 4 (Get Song Container Flow)
- **Flow dependencies**: `getSongPageFlow` → `searchSongFlow` → `getSongContainerFlow`
- **ARCHITECTURE_PLAN.md**: Reuse existing action blocks (waits)

---

## 📁 File Location

`src/flows/youtube/youtubeGetSongContainerFlow.js`

---

## 🔧 Function Signature

```javascript
async function getSongContainerFlow(page)
```

**Parameters**:
- `page` - Playwright page object (must be on YouTube search results page)

**Returns**:
```javascript
{
  success: boolean,
  message: string,
  container?: Locator,   // Locator for first video (ytd-video-renderer)
  error?: Error
}
```

---

## 📝 Step-by-Step Implementation

### **Step 1: Ensure Search Results Loaded**

**Action**: Wait for video results container

**Implementation**:
- Wait for `#contents` or `ytd-item-section-renderer #contents` (per transfer plan)
- Or wait for at least one `ytd-video-renderer` (video cards)
- Use `waitForElement` with `first: true` to avoid Playwright strict mode when multiple elements match

```javascript
const resultsResult = await waitForElement(page, 'ytd-item-section-renderer #contents, ytd-video-renderer', {
  timeout: 10000,
  state: 'visible',
  first: true
})
```

**Expected result**: Search results container is visible

---

### **Step 2: Locate First Video Container**

**Action**: Get locator for first video result

**Implementation**:
- Use `page.locator('ytd-video-renderer').first()` for the first video card
- Optionally validate that at least one video exists before returning

```javascript
const firstVideoLocator = page.locator('ytd-video-renderer').first()
const count = await page.locator('ytd-video-renderer').count()
if (count === 0) {
  return { success: false, message: 'No video results found' }
}
```

**Expected result**: Locator for first video is available

---

### **Step 3: Return Container Locator**

**Action**: Return success with container locator

**Implementation**:
- Return `{ success: true, container: firstVideoLocator, message: '...' }`
- Caller (e.g. `getSongPageFlow`) can use `container` to click first result

---

## 🎨 Selectors Reference

| Element | Selector | Notes |
|---------|----------|-------|
| Results section | `ytd-item-section-renderer` | Search results section |
| Results container | `#contents` | Inside item section |
| Video card | `ytd-video-renderer` | Single video result |
| First video | `ytd-video-renderer` + `.first()` | First result |

---

## 📦 Dependencies

- `waitForElement` from `actions/waits.js`
- `log`, `success`, `error` from `utils/logger.js`

---

## ⚠️ Error Handling

| Case | Handling |
|------|----------|
| Not on search results page | Return failure with message |
| No video results | Return failure ("No video results found") |
| Validation timeout | Return failure with timeout message |

---

## 🔄 Design Decisions

1. **Search**: Caller runs `searchSongFlow` first; this flow assumes page is already on search results
2. **Container**: Return locator for first `ytd-video-renderer` so caller can click it
3. **Validation**: Wait for at least one `ytd-video-renderer` before returning

---

## 📝 Implementation Order

1. Wait for video results container (`ytd-video-renderer` or `#contents`)
2. Get locator for first video
3. Validate at least one video exists
4. Return success + container locator

---

## 🔗 Usage Example

```javascript
// In getSongPageFlow
const searchResult = await searchSongFlow(page, `${song.title} ${song.artist}`)
if (!searchResult.success) return searchResult

const containerResult = await getSongContainerFlow(page)
if (!containerResult.success) return containerResult

await containerResult.container.click()
```

---

## ❓ Open Items

1. **Source file incomplete**: `get_song_container.txt` cuts off at "locate the foll" - confirm intended completion ("locate the following: video results container")
2. **Return type**: Return Playwright `Locator` vs. just validating presence (caller would re-locate). Returning locator avoids duplicate lookups.
3. **Scope**: Should this flow also run `searchSongFlow` internally (with `searchQuery` param), or remain a post-search step only?

---

## 📊 Expected Console Output

```
[INFO] Step 1/2: Waiting for video results container...
[SUCCESS] ✓ Video results loaded
[INFO] Step 2/2: Locating first video...
[SUCCESS] ✓ First video container found
```

---

**Status**: Ready for implementation
**Dependencies**: searchSongFlow (caller), Action blocks
**Last Updated**: 2026-02-20
