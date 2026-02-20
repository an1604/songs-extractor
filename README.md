# Extract All Songs

Extract songs from Anghami and transfer them to YouTube.

A modular Playwright-based scraper that supports scraping liked songs and playlists from Anghami and then adding them to YouTube (likes and playlists).

---

## Features

* **Anghami scraping**

  * Liked songs
  * Playlists
  * Playlist songs

* **YouTube transfer**

  * Add all liked songs to YouTube Likes
  * Create playlists on YouTube and add songs from Anghami playlists

---

## Prerequisites

* [Node.js](https://nodejs.org/) (v16+)
* [Playwright](https://playwright.dev/) (installed via npm)

---

## Installation

```bash
cd anghami
npm install
npx playwright install chromium
```

---

## Project Structure

```text
extract-all-songs/
└── anghami/
    ├── config/          # Configuration (URLs, paths, timeouts)
    ├── data/
    │   ├── output/      # songs.json (scraped data)
    │   └── session/     # Cookies (Anghami, YouTube)
    ├── flows/           # Flow definitions (human-readable)
    ├── specs/           # Implementation specs
    ├── src/
    │   ├── actions/     # Reusable actions (navigation, clicks, waits)
    │   ├── browser/     # Browser and session management
    │   ├── flows/       # Flow implementations (Anghami, YouTube)
    │   ├── output/      # JSON output builder
    │   └── utils/       # Logger, retry, etc.
    └── README.md
```

---

## Usage

All commands run from the `anghami` directory.

### Add All Songs to YouTube Likes

Transfers liked songs from `data/output/songs.json` to YouTube Likes.

```bash
cd anghami
npm start
```

**Environment variables:**

* `MAX_SONGS` — Limit number of songs to process (e.g. `MAX_SONGS=10`)

---

### Add Playlists to YouTube

Creates playlists on YouTube and adds songs from each Anghami playlist.

```bash
cd anghami
npm run youtube:playlists
```

**Environment variables:**

* `MAX_PLAYLISTS` — Limit number of playlists (e.g. `MAX_PLAYLISTS=5`)
* `MAX_SONGS_PER_PLAYLIST` — Limit songs per playlist (e.g. `MAX_SONGS_PER_PLAYLIST=20`)

---

## Data Format

Songs are stored in `data/output/songs.json`:

```json
{
  "metadata": {
    "scrapedAt": "...",
    "totalSongs": 0,
    "totalPlaylists": 0
  },
  "likedSongs": [
    {
      "title": "...",
      "artist": "...",
      "album": "..."
    }
  ],
  "playlists": [
    {
      "id": "...",
      "name": "...",
      "url": "...",
      "songCount": 0,
      "songs": [
        {
          "title": "...",
          "artist": "..."
        }
      ]
    }
  ]
}
```

---

## Configuration

Edit `anghami/config/config.js`:

* **paths.output** — Path to `songs.json` (default: `data/output/songs.json`)
* **paths.youtubeCookies** — YouTube session cookies (default: `data/session/youtube_cookies.json`)
* **browser.headless** — Run browser in headless mode (default: `false`)

---

## First Run

1. **YouTube login**
   On first run (or when the session expires), a browser window opens. Sign in to YouTube manually. The session is saved for future runs.

2. **Songs data**
   Ensure `data/output/songs.json` exists and contains playlists/liked songs. Scrape from Anghami first if needed.


