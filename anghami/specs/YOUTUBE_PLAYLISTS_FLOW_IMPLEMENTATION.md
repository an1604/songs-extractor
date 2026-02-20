# YouTube Playlists Flow - Implementation Plan

## 📋 Flow Definition Reference

**Source**: `anghami/flows/youtube_flows/playlists.txt`

**Flows**:
1. **Locate save btn** – Search → get container → get song page → click Save
2. **Locate Playlist container** – Run "Locate save btn" → wait for modal → locate playlists list
3. **Add song to playlist** – Search → get container → get song page → locate playlist container → find matching playlist → click it
4. **Create a Playlist** – Run "Locate Playlist container" → click New playlist → fill title → click Create
5. **Add playlists** – Extract playlists from JSON → for each: create playlist → for each song: add song to playlist

---

## 🏗️ Architecture Alignment

- **ARCHITECTURE_PLAN.md**: Reuse actions (navigation, clicks, waits), flows, OutputBuilder
- **YOUTUBE_TRANSFER_IMPLEMENTATION_PLAN.md**: Same pattern as add_song_to_likes
- **Flow dependencies**: Add song to playlist → Locate playlist container → Locate save btn → getSongPageFlow; Create playlist → Locate playlist container

---

## 📊 Data Structure (from `songs.json`)

```javascript
// Playlist from JSON
{
  id: string,
  name: string,
  url: string,
  songCount: number,
  scrapedAt: string,
  songs: [{ title, artist, album, url, duration, addedAt }, ...]
}
```

---

## 📁 File Layout

| Flow | File |
|------|------|
| Locate save btn | `src/flows/youtube/youtubeLocateSaveButtonFlow.js` |
| Locate playlist container | `src/flows/youtube/youtubeLocatePlaylistContainerFlow.js` |
| Add song to playlist | `src/flows/youtube/youtubeAddSongToPlaylistFlow.js` |
| Create playlist | `src/flows/youtube/youtubeCreatePlaylistFlow.js` |
| Add playlists | `src/flows/youtube/youtubeAddPlaylistsFlow.js` |

---

## Flow 1: Locate Save Button

### Function

```javascript
async function locateSaveButtonFlow(page, song)
```

### Steps

1. Call `getSongPageFlow(page, song)`
2. Wait for Save button: `button[aria-label="Save to playlist"]`
3. Click Save button
4. Return `{ success, message, error? }`

### Selectors

| Element | Selector |
|---------|----------|
| Save button | `button[aria-label="Save to playlist"]` |

---

## Flow 2: Locate Playlist Container

### Function

```javascript
async function locatePlaylistContainerFlow(page, song)
```

### Steps

1. Call `locateSaveButtonFlow(page, song)` (opens modal)
2. Wait for modal: `#contentWrapper` or `tp-yt-iron-dropdown`
3. Wait for playlists list: `#contentWrapper yt-sheet-view-model yt-contextual-sheet-layout div.ytContextualSheetLayoutContentContainer`
4. Return `{ success, container?, error? }`

### Selectors

| Element | Selector |
|---------|----------|
| Modal wrapper | `#contentWrapper` |
| Dropdown | `tp-yt-iron-dropdown` |
| Playlists list | `#contentWrapper > yt-sheet-view-model > yt-contextual-sheet-layout > div.ytContextualSheetLayoutContentContainer` |
| List items | `yt-list-item-view-model` with `aria-label="PlaylistName, Private/Public, Not selected"` or `"PlaylistName, Private/Public, Selected"` |

---

## Flow 3: Add Song to Playlist

### Function

```javascript
async function addSongToPlaylistFlow(page, song, playlistName)
```

### Steps

1. Call `locatePlaylistContainerFlow(page, song)`
2. Find playlist by name: match `aria-label` starting with `playlistName` or text in `.yt-list-item-view-model__title`
3. **Already in playlist**: Check `aria-pressed="true"` on the matching playlist item
   - If `aria-pressed="true"` → song is already in playlist → **skip click**, treat as success
   - If `aria-pressed="false"` → click playlist item to add song
4. **Modal close**: Press **Escape** key to close the modal
5. Return `{ success, message, alreadyInPlaylist?, error? }`

### Already in Playlist

| State | `aria-pressed` | `aria-label` suffix | Action |
|-------|----------------|---------------------|--------|
| Not in playlist | `false` | `Not selected` | Click to add |
| Already in playlist | `true` | `Selected` | Skip click, treat as success |

### Matching Playlist

- `aria-label` format: `"PlaylistName, Private/Public, Not selected"` or `"PlaylistName, Private/Public, Selected"`
- Match by `aria-label` starting with playlist name, or by text in `.yt-list-item-view-model__title`

### Modal Close

- Use **Escape** key (`page.keyboard.press('Escape')`) to close the playlist modal after adding or when already in playlist

---

## Flow 4: Create Playlist

### Function

```javascript
async function createPlaylistFlow(page, song, playlistName)
```

### Prerequisite

- Must be called when the Save modal is open (playlist container visible).
- `locatePlaylistContainerFlow(page, song)` must be run first to open the modal.

### Steps

| Step | Action | Selector / Notes |
|------|--------|-------------------|
| 1 | Run "Locate Playlist container" | `locatePlaylistContainerFlow(page, song)` – opens Save modal |
| 2 | Locate and click "New playlist" button | `button[aria-label="Create new playlist"]` (footer of Save modal) |
| 3 | Wait for New playlist dialog | `tp-yt-paper-dialog:has(h2:has-text("New playlist"))` or `tp-yt-paper-dialog[aria-modal="true"]` |
| 4 | Fill playlist title | `textarea[placeholder="Choose a title"]` or `yt-create-playlist-dialog-form-view-model textarea` |
| 5 | Click Create button | `button[aria-label="Create"]` (only when enabled, not `aria-disabled="true"`) |

### Selectors

| Element | Selector |
|---------|----------|
| New playlist button | `button[aria-label="Create new playlist"]` |
| New playlist dialog | `tp-yt-paper-dialog` with header "New playlist" |
| Title input | `textarea[placeholder="Choose a title"]`, or `yt-create-playlist-dialog-form-view-model textarea` |
| Create button | `button[aria-label="Create"]` |

### Create Button State

- Initially: `aria-disabled="true"` / `disabled="true"` when title is empty.
- After typing: `aria-disabled="false"` when title is non-empty.
- Wait for enabled state before clicking.

### Return

`{ success, playlistName?, error? }`

---

## Flow 5: Add Playlists

### Function

```javascript
async function addPlaylistsFlow(page, options)
```

### Steps

| Step | Action |
|------|--------|
| 1 | Load playlists from JSON (`OutputBuilder.load(config.paths.output)`) |
| 2 | For each playlist: |
| 2a | Run "Create a Playlist" – `createPlaylistFlow(page, firstSong, playlist.name)` |
| 2b | For each song in the playlist: run "Add song to playlist" – `addSongToPlaylistFlow(page, song, playlist.name)` |
| 2c | Delay between songs (e.g. 2–3 s) |

### Create Playlist Dependency

`createPlaylistFlow` requires a song to open the Save modal. Use the **first song** of the playlist as the context song.

### Flow Sequence Per Playlist

```
For playlist P with songs [S1, S2, S3, ...]:
  1. createPlaylistFlow(page, S1, P.name)  // S1 opens modal, create playlist
  2. addSongToPlaylistFlow(page, S1, P.name)  // add S1
  3. addSongToPlaylistFlow(page, S2, P.name)  // add S2
  4. ...
```

### Return

`{ success, totalPlaylists, totalSongs, added, failed, skipped, errors[] }`

---

## 🎨 Selectors Reference

| Element | Selector | Notes |
|---------|----------|-------|
| Save button | `button[aria-label="Save to playlist"]` | Opens playlist modal |
| Modal wrapper | `#contentWrapper` | From flow definition |
| Playlists list | `#contentWrapper > yt-sheet-view-model > yt-contextual-sheet-layout > div.ytContextualSheetLayoutContentContainer` | |
| Playlist item | `yt-list-item-view-model` | `aria-label="Name, Private/Public, Not selected"` or `Selected` |
| Playlist title | `.yt-list-item-view-model__title` | Text content |
| Already in playlist | `aria-pressed="true"` | On playlist item |
| New playlist button | `button[aria-label="Create new playlist"]` | Footer of Save modal |
| New playlist dialog | `tp-yt-paper-dialog` | With header "New playlist" |
| Title textarea | `textarea[placeholder="Choose a title"]` | Create playlist form |
| Create button | `button[aria-label="Create"]` | Wait until not disabled |

---

## 🔒 Edge Cases & Error Handling

| Case | Handling |
|------|----------|
| Song page fails | Return failure |
| Save button not found | Return failure |
| Modal does not open | Return failure |
| Playlist not found | Return failure |
| **Already in playlist** | Skip click, treat as success, count as `skipped` |
| Modal close | Use **Escape** key |
| Create: New playlist btn not found | Return failure |
| Create: Dialog does not open | Timeout and fail |
| Create: Create btn stays disabled | Retry typing or fail with clear message |

---

## 📦 Dependencies

- `getSongPageFlow` (existing)
- `searchSongFlow`, `getSongContainerFlow` (via getSongPageFlow)
- `waitForElement`, `waitForTimeout` from `actions/waits.js`
- `clickElement` from `actions/clicks.js`
- `page.keyboard.press('Escape')` for modal close
- `OutputBuilder` for loading playlists

---

## 📝 Implementation Order

1. `youtubeLocateSaveButtonFlow.js`
2. `youtubeLocatePlaylistContainerFlow.js`
3. `youtubeAddSongToPlaylistFlow.js` (with already-in-playlist check + Escape for modal close)
4. `youtubeCreatePlaylistFlow.js`
5. `youtubeAddPlaylistsFlow.js`

---

## ❓ Open Items

1. **Playlist name matching** – Exact vs fuzzy (e.g. "Watch later" vs "watch later")
2. **Playlist already exists** – Detect and skip create, or treat as success

---

## Usage Example

```javascript
// Add single song to a playlist
await addSongToPlaylistFlow(page, { title: 'Believer', artist: 'Imagine Dragons' }, 'Favorites');

// Add all playlists (after Create Playlist is implemented)
await addPlaylistsFlow(page, { songsFilePath: config.paths.output });
```

---

**Status**: Ready for implementation  
**Dependencies**: getSongPageFlow, actions, OutputBuilder  
**Last Updated**: 2026-02-20
