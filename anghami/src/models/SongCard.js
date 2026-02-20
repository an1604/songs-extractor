class SongCard {
  constructor({ title, artist, album = null, url = null, duration = null, addedAt = null }) {
    this.title = title
    this.artist = artist
    this.album = album
    this.url = url
    this.duration = duration
    this.addedAt = addedAt || new Date().toISOString()
  }

  toJSON() {
    return {
      title: this.title,
      artist: this.artist,
      album: this.album,
      url: this.url,
      duration: this.duration,
      addedAt: this.addedAt
    }
  }

  toString() {
    return `${this.title} - ${this.artist}${this.album ? ` (${this.album})` : ''}`
  }

  isValid() {
    return Boolean(this.title && this.artist)
  }
}

module.exports = { SongCard }
