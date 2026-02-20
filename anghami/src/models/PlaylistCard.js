class PlaylistCard {
  constructor({ id, name, url, songCount = 0, songs = [], scrapedAt = null }) {
    this.id = id
    this.name = name
    this.url = url
    this.songCount = songCount
    this.songs = songs
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

module.exports = { PlaylistCard }
