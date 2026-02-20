# YouTube Login Flow Implementation

## 📋 Flow Definition Reference

**Source**: `anghami/flows/youtube_flows/login.txt`

**Steps**:
1. Go to `https://www.youtube.com/`
2. Locate the Sign In button and press it
3. Wait for the following element to appear (logged-in state): `#avatar-btn` (Account menu button with avatar image)

---

## 🏗️ Architecture Alignment

### **References**
- **ARCHITECTURE_PLAN.md**: Actions layer (navigation, clicks, waits), Flows layer, Session management
- **YOUTUBE_TRANSFER_IMPLEMENTATION_PLAN.md**: Phase 2 (YouTube Login Flow), Phase 1 (Config & Session)

### **File Location**
`src/flows/youtube/youtubeLoginFlow.js`

### **Design Principles**
- Modular: Reuse existing action blocks (goTo, clickElement, waitForElement)
- Readable: Steps map 1:1 to flow definition
- Maintainable: No complex logic, clear error handling
- Session: Save cookies for reuse (same pattern as Anghami)

---

## 📦 Dependencies

### **Action Blocks** (Shared - reuse from existing)
```javascript
const { goTo } = require('../../actions/navigation')  // or shared actions path
const { clickElement } = require('../../actions/clicks')
const { waitForElement } = require('../../actions/waits')
```

### **Browser/Session**
```javascript
const { saveYouTubeSession } = require('../../browser/sessionManager')
```

### **Config & Utils**
```javascript
const config = require('../../../config/config')
const { log, success, error } = require('../../utils/logger')
```

**Note**: Exact require paths depend on final project structure. Adjust `../../` depth based on `src/flows/youtube/` location.

---

## 🔧 Function Signature

```javascript
async function executeYouTubeLoginFlow(page, context)
```

**Parameters**:
- `page` - Playwright page object
- `context` - Playwright browser context (for saving cookies)

**Returns**:
```javascript
{
  success: boolean,
  message: string,
  error?: Error
}
```

---

## 📝 Step-by-Step Implementation

### **Step 1: Navigate to YouTube Homepage**

**Action**: `goTo(page, url)`

**Implementation**:
```javascript
log('Step 1/3: Navigating to YouTube...')
const navResult = await goTo(page, config.urls.youtube.base)
if (!navResult.success) {
  return { success: false, message: 'Failed to navigate to YouTube', error: navResult.error }
}
success('✓ YouTube loaded')
```

**URL**: `https://www.youtube.com/` (from config)

**Expected result**: YouTube homepage is visible

---

### **Step 2: Click Sign In Button**

**Action**: `clickElement(page, selector)`

**Selector Strategy** (requires verification - `login.txt` references child element):

The flow definition shows `yt-touch-feedback-shape` as a **child** of the Sign In button. We need the **parent** clickable element.

**Candidate selectors** (to verify on live page):
- `a[href*="accounts.google.com"]` - Link to Google sign-in
- `button:has-text("Sign in")` - Text-based
- `#sign-in-button` - If ID exists
- `ytd-button-renderer:has-text("Sign in")` - YouTube custom element
- `a.yt-spec-button-shape-next--filled` - Styled sign-in link

**Implementation**:
```javascript
log('Step 2/3: Clicking Sign In button...')
const signInSelector = 'a[href*="accounts.google.com"], button:has-text("Sign in"), #sign-in-button'
const clickResult = await clickElement(page, signInSelector)
if (!clickResult.success) {
  return { success: false, message: 'Failed to click Sign In button', error: clickResult.error }
}
success('✓ Sign In clicked')
log('⏳ Complete sign-in in the browser window...')
```

**Expected result**: Browser navigates to Google OAuth / sign-in page. User completes login manually.

**Important**: YouTube uses Google OAuth. The flow does NOT automate credentials - user must:
1. Enter email/password, or
2. Select Google account, or
3. Complete 2FA if prompted

---

### **Step 3: Wait for Logged-In State (Avatar Button)**

**Action**: `waitForElement(page, selector, options)`

**Selector** (from flow definition):
- Primary: `#avatar-btn`
- Fallback: `button[aria-label="Account menu"]`
- Alternative: `ytd-topbar-menu-button-renderer #avatar-btn`

**Implementation**:
```javascript
log('Step 3/3: Waiting for login completion...')
const avatarResult = await waitForElement(page, '#avatar-btn', {
  timeout: 120000,  // 2 minutes - user may need time to complete OAuth
  state: 'visible'
})
if (!avatarResult.success) {
  return { success: false, message: 'Login timeout - avatar button did not appear', error: avatarResult.error }
}
success('✓ Logged in - avatar button visible')
```

**Expected result**: User is logged in; avatar/account menu button is visible in top bar.

---

### **Step 4: Save Session (Post-Flow)**

**Action**: `saveYouTubeSession(context, filepath)`

**Implementation**:
```javascript
log('Saving YouTube session cookies...')
const sessionResult = await saveYouTubeSession(context, config.paths.youtubeCookies)
if (!sessionResult.success) {
  error('⚠ Warning: Failed to save YouTube session, will need to login again next time')
} else {
  success('✓ YouTube session saved')
}
```

**Expected result**: Cookies saved to `data/session/youtube_cookies.json`

**Note**: This step requires Phase 1 (Session Manager extension) from YOUTUBE_TRANSFER_IMPLEMENTATION_PLAN.

---

## 🎯 Action Block Usage Summary

| Step | Action Block | Module | Retry? | Timeout |
|------|-------------|--------|--------|---------|
| 1 | `goTo()` | navigation | ✅ Yes | 30s (default) |
| 2 | `clickElement()` | clicks | ✅ Yes | 5s (default) |
| 3 | `waitForElement()` | waits | ✅ Yes | 120s (user OAuth) |
| 4 | `saveYouTubeSession()` | sessionManager | ✅ Yes | N/A |

---

## 🔍 Selector Reference

| Element | Selector | Source | Notes |
|---------|----------|--------|-------|
| Sign In button | TBD | login.txt (child ref) | `yt-touch-feedback-shape` is child; parent needs live inspection |
| Avatar (logged in) | `#avatar-btn` | login.txt | Confirmed in flow definition |
| Avatar (alt) | `button[aria-label="Account menu"]` | login.txt | Same element, aria attribute |

---

## ⚠️ Error Handling

### **Possible Failures**

| Failure | Cause | Retry? | User Action |
|---------|-------|--------|-------------|
| Navigation timeout | Network issues | ✅ Yes | Check internet |
| Sign In button not found | Page structure / A/B test | ✅ Yes | Verify selector on live page |
| Avatar timeout | User didn't complete OAuth | ❌ No | Complete sign-in in browser |
| Session save failed | File permissions | ✅ Yes | Check `data/session/` writable |

### **Error Return Format**
```javascript
{
  success: false,
  message: 'Human-readable error message',
  error: Error object
}
```

---

## 🔄 Session Reuse Flow (Integration)

**When used in YouTube transfer**:
```javascript
// In youtubeTransfer.js or similar
const hasYouTubeSession = await loadYouTubeSession(context, config.paths.youtubeCookies)

if (hasYouTubeSession && await isYouTubeSessionValid(page)) {
  success('Using saved YouTube session')
  // Skip login flow
} else {
  log('No valid YouTube session, running login flow...')
  const loginResult = await executeYouTubeLoginFlow(page, context)
  if (!loginResult.success) {
    return // Abort transfer
  }
}
```

---

## 📋 Prerequisites (from YOUTUBE_TRANSFER_IMPLEMENTATION_PLAN)

Before implementing this flow, ensure:

1. **Config** (`config/config.js`):
   - `config.urls.youtube.base` = `'https://www.youtube.com/'`
   - `config.paths.youtubeCookies` = `'data/session/youtube_cookies.json'`

2. **Session Manager** (`src/browser/sessionManager.js`):
   - `saveYouTubeSession(context, filepath)`
   - `loadYouTubeSession(context, filepath)`
   - `isYouTubeSessionValid(page)` - checks for `#avatar-btn`

---

## 🧪 Testing Checklist

- [ ] Navigate to YouTube successfully
- [ ] Sign In button is found and clickable
- [ ] Browser opens Google sign-in (same tab or new tab)
- [ ] User can complete OAuth manually
- [ ] Avatar button appears after login
- [ ] Session cookies are saved
- [ ] Next run: loaded session skips login
- [ ] `isYouTubeSessionValid()` returns true when logged in

---

## 📊 Expected Console Output

```
Step 1/3: Navigating to YouTube...
✓ YouTube loaded
Step 2/3: Clicking Sign In button...
✓ Sign In clicked
⏳ Complete sign-in in the browser window...
Step 3/3: Waiting for login completion...
✓ Logged in - avatar button visible
Saving YouTube session cookies...
✓ YouTube session saved
```

---

## ❓ Open Items

1. **Sign In selector**: Verify exact selector on live YouTube page. The flow definition only references a child element. May need to use Playwright's codegen or manual inspection.
2. **OAuth flow**: Does Sign In open same tab or new tab? May need `waitForNewPage` or `waitForNavigation` if new tab.
3. **Language**: Selectors like `:has-text("Sign in")` assume English. Consider `aria-label` or more stable selectors for i18n.

---

## 📝 Implementation Order

1. Add YouTube config (Phase 1.1)
2. Extend session manager for YouTube (Phase 1.2)
3. Implement `youtubeLoginFlow.js` (Steps 1–4)
4. Verify Sign In selector on live page
5. Test full login + session save
6. Test session load + skip login on next run

---

**Status**: Ready for implementation
**Dependencies**: Config update, Session manager extension, Shared actions (goTo, clickElement, waitForElement)
**Estimated Time**: 45 minutes (including selector verification)
**Last Updated**: 2026-02-20
