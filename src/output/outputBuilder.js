class OutputBuilder {
  constructor() {
    this.data = {
      metadata: {
        scrapedAt: new Date().toISOString(),
        totalSongs: 0,
        totalPlaylists: 0,
        totalAlbums: 0,
        totalArtists: 0
      },
      likedSongs: [],
      playlists: [],
      albums: [],
      artists: []
    }
  }

  addLikedSong(song) {
    this.data.likedSongs.push(song)
    this.data.metadata.totalSongs++
  }

  addPlaylist(playlist) {
    this.data.playlists.push(playlist)
    this.data.metadata.totalPlaylists++
  }

  addAlbum(album) {
    this.data.albums.push(album)
    this.data.metadata.totalAlbums++
  }

  addArtist(artist) {
    this.data.artists.push(artist)
    this.data.metadata.totalArtists++
  }

  async save(filepath) {
    const fs = require('fs').promises
    const path = require('path')
    
    const dir = path.dirname(filepath)
    await fs.mkdir(dir, { recursive: true })
    
    await fs.writeFile(
      filepath, 
      JSON.stringify(this.data, null, 2), 
      'utf8'
    )
  }

  async load(filepath) {
    const fs = require('fs').promises
    const data = await fs.readFile(filepath, 'utf8')
    this.data = JSON.parse(data)
  }
}

module.exports = { OutputBuilder }
