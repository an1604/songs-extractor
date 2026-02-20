const { addSongToPlaylistFlow } = require('./youtubeAddSongToPlaylistFlow')
const { createPlaylistFlow } = require('./youtubeCreatePlaylistFlow')
const { OutputBuilder } = require('../../output/outputBuilder')
const { waitForTimeout } = require('../../actions/waits')
const config = require('../../../config/config')
const { log, success, error } = require('../../utils/logger')

async function addPlaylistsFlow(page, options = {}) {
  const songsFilePath = options.songsFilePath || config.paths.output
  const delayBetweenSongs = options.delayBetweenSongs ?? 2500
  const maxPlaylists = options.maxPlaylists ?? Infinity
  const maxSongsPerPlaylist = options.maxSongsPerPlaylist ?? Infinity

  let added = 0
  let failed = 0
  let skipped = 0
  const errors = []

  try {
    log('Step 1/4: Loading playlists from JSON...')
    const output = new OutputBuilder()
    await output.load(songsFilePath)
    const playlists = output.data.playlists || []
    success(`✓ Loaded ${playlists.length} playlists from ${songsFilePath}`)

    if (!playlists.length) {
      success('✓ No playlists to process')
      return {
        success: true,
        totalPlaylists: 0,
        totalSongs: 0,
        added: 0,
        failed: 0,
        skipped: 0,
        errors: []
      }
    }

    const playlistsToProcess = playlists.slice(0, maxPlaylists)
    log(`Step 2/4: Processing ${playlistsToProcess.length} playlists...`)

    for (let p = 0; p < playlistsToProcess.length; p++) {
      const playlist = playlistsToProcess[p]
      const songs = (playlist.songs || []).slice(0, maxSongsPerPlaylist)

      log(`\n[Playlist ${p + 1}/${playlistsToProcess.length}] ${playlist.name} (${songs.length} songs)`)

      if (!songs.length) {
        log('Skipping create: playlist has no songs (need song to open Save modal)')
      } else {
        log('Creating playlist...')
        const firstSong = songs[0]
        const createResult = await createPlaylistFlow(page, firstSong, playlist.name)
        if (!createResult.success) {
          error(`  Failed to create playlist: ${createResult.message}`)
          errors.push({ playlist: playlist.name, message: createResult.message, error: createResult.error })
          failed += songs.length
          continue
        }
        success('✓ Playlist created')
        await waitForTimeout(1000)
      }

      log('Step 3/4: Adding songs to playlist...')
      for (let s = 0; s < songs.length; s++) {
        const song = songs[s]
        const songLabel = `${song.title} - ${song.artist}`

        log(`  [${s + 1}/${songs.length}] ${songLabel}`)
        const result = await addSongToPlaylistFlow(page, song, playlist.name)

        if (result.success) {
          if (result.alreadyInPlaylist) {
            skipped++
            log(`    → Skipped (already in playlist)`)
          } else {
            added++
            log(`    → Added`)
          }
        } else {
          failed++
          errors.push({ playlist: playlist.name, song: songLabel, message: result.message, error: result.error })
          error(`    → Failed: ${result.message}`)
        }

        if (s < songs.length - 1) {
          await waitForTimeout(delayBetweenSongs)
        }
      }
    }

    log('\nStep 4/4: Summary')
    success(`✓ Completed: ${added} added, ${skipped} skipped, ${failed} failed`)

    return {
      success: failed === 0,
      totalPlaylists: playlistsToProcess.length,
      totalSongs: added + failed + skipped,
      added,
      failed,
      skipped,
      errors
    }
  } catch (err) {
    error('Add playlists flow failed:', err.message)
    return {
      success: false,
      totalPlaylists: 0,
      totalSongs: added + failed + skipped,
      added,
      failed,
      skipped,
      errors: [...errors, { message: err.message, error: err }]
    }
  }
}

module.exports = { addPlaylistsFlow }
