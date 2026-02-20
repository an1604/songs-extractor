const fs = require('fs').promises
const path = require('path')
const { log, error: logError } = require('../utils/logger')

async function saveSession(context, filepath) {
  try {
    const cookies = await context.cookies()
    
    const dir = path.dirname(filepath)
    await fs.mkdir(dir, { recursive: true })
    
    await fs.writeFile(filepath, JSON.stringify(cookies, null, 2), 'utf8')
    
    return { success: true, data: cookies }
  } catch (err) {
    logError('Failed to save session:', err.message)
    return { success: false, error: err }
  }
}

async function loadSession(context, filepath) {
  try {
    const cookiesJson = await fs.readFile(filepath, 'utf8')
    const cookies = JSON.parse(cookiesJson)
    
    await context.addCookies(cookies)
    
    return { success: true, data: cookies }
  } catch (err) {
    return { success: false, error: err }
  }
}

async function isSessionValid(page) {
  try {
    const logoutButton = await page.locator('text=Logout').count()
    return logoutButton > 0
  } catch (err) {
    return false
  }
}

async function clearSession(filepath) {
  try {
    await fs.unlink(filepath)
    return { success: true }
  } catch (err) {
    return { success: false, error: err }
  }
}

async function saveYouTubeSession(context, filepath) {
  return saveSession(context, filepath)
}

async function loadYouTubeSession(context, filepath) {
  return loadSession(context, filepath)
}

async function isYouTubeSessionValid(page) {
  try {
    const avatarBtn = await page.locator('#avatar-btn').count()
    return avatarBtn > 0
  } catch (err) {
    return false
  }
}

async function clearYouTubeSession(filepath) {
  return clearSession(filepath)
}

module.exports = {
  saveSession,
  loadSession,
  isSessionValid,
  clearSession,
  saveYouTubeSession,
  loadYouTubeSession,
  isYouTubeSessionValid,
  clearYouTubeSession
}
