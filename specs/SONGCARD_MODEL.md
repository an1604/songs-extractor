# SongCard Model Implementation

## Overview
Created a `SongCard` class to represent songs with a clean, structured approach for data collection.

---

## Class Structure

### Location
`anghami/src/models/SongCard.js`

### Properties
- `title` (string, required) - Song title
- `artist` (string, required) - Artist name
- `album` (string, optional) - Album name
- `url` (string, optional) - Song URL from Anghami
- `duration` (string, optional) - Song duration
- `addedAt` (string, auto-generated) - ISO timestamp when the song was scraped

### Methods

#### `constructor({ title, artist, album, url, duration, addedAt })`
Creates a new SongCard instance with the provided data.

#### `toJSON()`
Returns a plain JavaScript object representation of the song (used for JSON serialization).

#### `toString()`
Returns a human-readable string representation: `"Title - Artist (Album)"`

#### `isValid()`
Validates that the song has at least a title and artist (required fields).

---

## Integration

### Updated Files
1. **`anghami/src/models/SongCard.js`** (new file)
   - Contains the SongCard class definition

2. **`anghami/src/flows/scrapeLikesFlow.js`**
   - Imports the SongCard class
   - Creates SongCard instances for each extracted song
   - Validates songs using `isValid()` before adding to output
   - Now extracts the song URL (`href` attribute) as well

---

## Usage Example

```javascript
const { SongCard } = require('./models/SongCard')

// Create a new song card
const song = new SongCard({
  title: 'Believer',
  artist: 'Imagine Dragons',
  album: 'Evolve',
  url: '/song/12345678'
})

// Validate
if (song.isValid()) {
  // Convert to JSON for storage
  const jsonData = song.toJSON()
  
  // Display
  console.log(song.toString()) // "Believer - Imagine Dragons (Evolve)"
}
```

---

## Benefits

1. **Type Safety**: Centralized data structure ensures consistency
2. **Validation**: Built-in validation with `isValid()` method
3. **Extensibility**: Easy to add new properties (duration, genre, etc.)
4. **Clean Code**: Encapsulates song data logic in one place
5. **Reusability**: Can be used across different flows (playlists, albums, etc.)

---

## Output Format

The JSON output now includes:

```json
{
  "metadata": {
    "scrapedAt": "2026-02-20T10:30:00.000Z",
    "totalSongs": 1500
  },
  "likedSongs": [
    {
      "title": "Believer",
      "artist": "Imagine Dragons",
      "album": "Evolve",
      "url": "/song/12345678",
      "duration": null,
      "addedAt": "2026-02-20T10:30:15.000Z"
    }
  ]
}
```

---

## Future Enhancements

Potential additions to the SongCard class:
- `duration` extraction (if available in HTML)
- `genre` property
- `releaseYear` property
- `playCount` property
- `isExplicit` flag
- `thumbnailUrl` property
