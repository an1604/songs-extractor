const { addSongToLikesFlow } = require('./youtubeAddSongToLikesFlow')
const { OutputBuilder } = require('../../output/outputBuilder')
const { waitForTimeout } = require('../../actions/waits')
const config = require('../../../config/config')
const { log, success, error } = require('../../utils/logger')

async function addAllSongsToLikesFlow(page, options = {}) {
  const songsFilePath = options.songsFilePath || config.paths.output
  const delayBetweenSongs = options.delayBetweenSongs ?? 2500
  const maxSongs = options.maxSongs ?? Infinity
  const startIndex = options.startIndex ?? 0

  let added = 0
  let failed = 0
  let skipped = 0
  const errors = []

  try {
    log('Step 1/4: Loading songs from JSON...')
    const output = new OutputBuilder()
    await output.load(songsFilePath)
    const songs = output.data.likedSongs || []
    success(`✓ Loaded ${songs.length} songs from ${songsFilePath}`)

    if (!songs.length) {
      success('✓ No songs to process')
      return {
        success: true,
        totalProcessed: 0,
        added: 0,
        failed: 0,
        skipped: 0,
        errors: []
      }
    }

    const endIndex = Math.min(songs.length, startIndex + maxSongs)
    const toProcess = endIndex - startIndex
    log(`Step 2/4: Processing ${toProcess} songs...`)
    log('Step 3/4: Adding each song to YouTube likes...')

    for (let i = startIndex; i < endIndex; i++) {
      const song = songs[i]
      const songLabel = `${song.title} - ${song.artist}`

      log(`[${i - startIndex + 1}/${toProcess}] ${songLabel}`)
      const result = await addSongToLikesFlow(page, song)

      if (result.success) {
        if (result.alreadyLiked) {
          skipped++
          log(`  → Skipped (already liked)`)
        } else {
          added++
          log(`  → Added`)
        }
      } else {
        failed++
        errors.push({ song: songLabel, message: result.message, error: result.error })
        error(`  → Failed: ${result.message}`)
      }

      if ((i - startIndex + 1) % 10 === 0 || i === endIndex - 1) {
        log(`Progress: ${i - startIndex + 1}/${toProcess} | Added: ${added} | Skipped: ${skipped} | Failed: ${failed}`)
      }

      if (i < endIndex - 1) {
        await waitForTimeout(delayBetweenSongs)
      }
    }

    log('Step 4/4: Summary')
    success(`✓ Completed: ${added} added, ${skipped} skipped, ${failed} failed`)

    return {
      success: failed === 0,
      totalProcessed: added + failed + skipped,
      added,
      failed,
      skipped,
      errors
    }
  } catch (err) {
    error('Add all songs to likes flow failed:', err.message)
    return {
      success: false,
      totalProcessed: added + failed + skipped,
      added,
      failed,
      skipped,
      errors: [...errors, { song: 'N/A', message: err.message, error: err }]
    }
  }
}

module.exports = { addAllSongsToLikesFlow }
