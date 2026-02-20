# Login Flow Implementation

## 📋 Flow Definition Reference

**Source**: `anghami/flows/login.txt`

**Steps**:
1. Go to "https://www.anghami.com/"
2. Locate the hamburger menu div
3. Click the Login button: `<a class="hamburger_login__YVSPA" id="header_login_button">Login</a>`
4. Wait for login popup to appear: `<div id="login_popup" class="styles_LoginPopup__XoY2r">`
5. Locate the QR code section
6. Click "Scan QR code" button: `<div class="styles_QRLogin-btn__MHRfa">Scan QR code</div>`
7. Wait for logout button to appear: `<a class="hamburger_login__YVSPA">Logout</a>`

---

## 🏗️ Implementation Architecture

### **File**: `src/flows/loginFlow.js`

### **Dependencies**:
```javascript
const { goTo } = require('../actions/navigation')
const { clickElement } = require('../actions/clicks')
const { waitForElement, waitForText } = require('../actions/waits')
const { saveSession } = require('../browser/sessionManager')
const config = require('../../config/config')
const { log, success, error } = require('../utils/logger')
```

### **Function Signature**:
```javascript
async function executeLoginFlow(page)
```

**Parameters**:
- `page` - Playwright page object

**Returns**:
```javascript
{
  success: true/false,
  message: string,
  error?: Error
}
```

---

## 📝 Step-by-Step Implementation

### **Step 1: Navigate to Homepage**

**Action**: `goTo(page, url)`

**Implementation**:
```javascript
log('Step 1/7: Navigating to Anghami homepage...')
const navResult = await goTo(page, config.urls.base)
if (!navResult.success) {
  return { success: false, message: 'Failed to navigate to homepage', error: navResult.error }
}
success('✓ Homepage loaded')
```

**What happens**:
- Navigate to `https://www.anghami.com/`
- Retry up to 3 times if navigation fails
- Wait for page to load completely

**Expected result**: Homepage is visible

---

### **Step 2: Click Login Button**

**Action**: `clickElement(page, selector)`

**Selector Strategy**:
- Primary: `#header_login_button` (ID selector - most reliable)
- Fallback: `.hamburger_login__YVSPA` (class selector)
- Alternative: `text=Login` (text selector)

**Implementation**:
```javascript
log('Step 2/7: Clicking login button...')
const loginButtonResult = await clickElement(page, '#header_login_button')
if (!loginButtonResult.success) {
  return { success: false, message: 'Failed to click login button', error: loginButtonResult.error }
}
success('✓ Login button clicked')
```

**What happens**:
- Locate the login button in the header
- Click it with retry logic
- Trigger login popup to appear

**Expected result**: Login popup starts appearing

---

### **Step 3: Wait for Login Popup**

**Action**: `waitForElement(page, selector)`

**Selector**: `#login_popup`

**Implementation**:
```javascript
log('Step 3/7: Waiting for login popup...')
const popupResult = await waitForElement(page, '#login_popup', {
  timeout: 10000,
  state: 'visible'
})
if (!popupResult.success) {
  return { success: false, message: 'Login popup did not appear', error: popupResult.error }
}
success('✓ Login popup appeared')
```

**What happens**:
- Wait up to 10 seconds for popup
- Verify popup is visible (not just present in DOM)
- Retry if needed

**Expected result**: Login popup is fully visible with QR code option

---

### **Step 4: Click "Scan QR code" Button**

**Action**: `clickElement(page, selector)`

**Selector Strategy**:
- Primary: `.styles_QRLogin-btn__MHRfa` (class selector)
- Alternative: `#login_popup >> text=Scan QR code` (scoped text selector)

**Implementation**:
```javascript
log('Step 4/7: Clicking "Scan QR code" button...')
const qrButtonResult = await clickElement(page, '.styles_QRLogin-btn__MHRfa')
if (!qrButtonResult.success) {
  return { success: false, message: 'Failed to click QR code button', error: qrButtonResult.error }
}
success('✓ QR code button clicked')
```

**What happens**:
- Locate "Scan QR code" button inside popup
- Click it to display QR code
- QR code appears for mobile scanning

**Expected result**: QR code is displayed for user to scan

---

### **Step 5: Wait for Login Completion**

**Action**: `waitForText(page, text)`

**Selector**: `text=Logout`

**Implementation**:
```javascript
log('Step 5/7: Waiting for login completion (scan QR with mobile app)...')
log('⏳ Please scan the QR code with your Anghami mobile app...')

const logoutResult = await waitForText(page, 'Logout', {
  timeout: 120000  // 2 minutes for user to scan
})
if (!logoutResult.success) {
  return { success: false, message: 'Login timeout - QR code not scanned', error: logoutResult.error }
}
success('✓ Login successful!')
```

**What happens**:
- Wait for "Logout" button to appear (indicates successful login)
- Timeout after 2 minutes if user doesn't scan
- User scans QR code with mobile app during this wait

**Expected result**: User is logged in, "Logout" button visible

---

### **Step 6: Save Session**

**Action**: `saveSession(context, filepath)`

**Implementation**:
```javascript
log('Step 6/7: Saving session cookies...')
const sessionResult = await saveSession(page.context(), config.paths.cookies)
if (!sessionResult.success) {
  error('⚠ Warning: Failed to save session, will need to login again next time')
} else {
  success('✓ Session saved')
}
```

**What happens**:
- Extract all cookies from browser context
- Save to `data/session/cookies.json`
- Allows reuse of login in future runs

**Expected result**: Cookies saved to file

---

### **Step 7: Verify Login State**

**Action**: `waitForElement(page, selector)`

**Selector**: `.hamburger_login__YVSPA:has-text("Logout")`

**Implementation**:
```javascript
log('Step 7/7: Verifying login state...')
const verifyResult = await waitForElement(page, 'text=Logout', {
  timeout: 5000
})
if (!verifyResult.success) {
  return { success: false, message: 'Login verification failed', error: verifyResult.error }
}
success('✓ Login verified')
```

**What happens**:
- Double-check that "Logout" button still exists
- Ensures login state is stable
- Final confirmation

**Expected result**: Login is confirmed and stable

---

## 📄 Complete Implementation Code

```javascript
// src/flows/loginFlow.js
const { goTo } = require('../actions/navigation')
const { clickElement } = require('../actions/clicks')
const { waitForElement, waitForText } = require('../actions/waits')
const { saveSession } = require('../browser/sessionManager')
const config = require('../../config/config')
const { log, success, error } = require('../utils/logger')

async function executeLoginFlow(page) {
  try {
    // Step 1: Navigate to homepage
    log('Step 1/7: Navigating to Anghami homepage...')
    const navResult = await goTo(page, config.urls.base)
    if (!navResult.success) {
      return { success: false, message: 'Failed to navigate to homepage', error: navResult.error }
    }
    success('✓ Homepage loaded')

    // Step 2: Click login button
    log('Step 2/7: Clicking login button...')
    const loginButtonResult = await clickElement(page, '#header_login_button')
    if (!loginButtonResult.success) {
      return { success: false, message: 'Failed to click login button', error: loginButtonResult.error }
    }
    success('✓ Login button clicked')

    // Step 3: Wait for login popup
    log('Step 3/7: Waiting for login popup...')
    const popupResult = await waitForElement(page, '#login_popup', {
      timeout: 10000,
      state: 'visible'
    })
    if (!popupResult.success) {
      return { success: false, message: 'Login popup did not appear', error: popupResult.error }
    }
    success('✓ Login popup appeared')

    // Step 4: Click "Scan QR code" button
    log('Step 4/7: Clicking "Scan QR code" button...')
    const qrButtonResult = await clickElement(page, '.styles_QRLogin-btn__MHRfa')
    if (!qrButtonResult.success) {
      return { success: false, message: 'Failed to click QR code button', error: qrButtonResult.error }
    }
    success('✓ QR code displayed')

    // Step 5: Wait for login completion (user scans QR code)
    log('Step 5/7: Waiting for login completion...')
    log('⏳ Please scan the QR code with your Anghami mobile app...')
    const logoutResult = await waitForText(page, 'Logout', {
      timeout: 120000  // 2 minutes for user to scan
    })
    if (!logoutResult.success) {
      return { success: false, message: 'Login timeout - QR code not scanned', error: logoutResult.error }
    }
    success('✓ Login successful!')

    // Step 6: Save session cookies
    log('Step 6/7: Saving session cookies...')
    const sessionResult = await saveSession(page.context(), config.paths.cookies)
    if (!sessionResult.success) {
      error('⚠ Warning: Failed to save session, will need to login again next time')
    } else {
      success('✓ Session saved')
    }

    // Step 7: Verify login state
    log('Step 7/7: Verifying login state...')
    const verifyResult = await waitForElement(page, 'text=Logout', {
      timeout: 5000
    })
    if (!verifyResult.success) {
      return { success: false, message: 'Login verification failed', error: verifyResult.error }
    }
    success('✓ Login verified')

    return {
      success: true,
      message: 'Login flow completed successfully'
    }

  } catch (err) {
    error('Login flow failed:', err.message)
    return {
      success: false,
      message: 'Login flow failed with exception',
      error: err
    }
  }
}

module.exports = { executeLoginFlow }
```

---

## 🎯 Action Block Usage Summary

| Step | Action Block | Module | Retry? |
|------|-------------|--------|--------|
| 1 | `goTo()` | `navigation.js` | ✅ Yes (3x) |
| 2 | `clickElement()` | `clicks.js` | ✅ Yes (3x) |
| 3 | `waitForElement()` | `waits.js` | ✅ Yes (3x) |
| 4 | `clickElement()` | `clicks.js` | ✅ Yes (3x) |
| 5 | `waitForText()` | `waits.js` | ❌ No (user action) |
| 6 | `saveSession()` | `sessionManager.js` | ✅ Yes (3x) |
| 7 | `waitForElement()` | `waits.js` | ✅ Yes (3x) |

---

## 🔍 Selector Strategy

### **Why These Selectors?**

1. **`#header_login_button`** - ID selector (most stable, fastest)
2. **`#login_popup`** - ID selector (unique identifier)
3. **`.styles_QRLogin-btn__MHRfa`** - Class selector (specific to QR button)
4. **`text=Logout`** - Text selector (language-dependent but clear intent)

### **Fallback Strategy**

If primary selectors fail, action blocks will automatically try:
1. Primary selector (ID/class)
2. Text-based selector
3. XPath selector (last resort)

---

## ⚠️ Error Handling

### **Possible Failures**

| Failure | Cause | Retry? | User Action |
|---------|-------|--------|-------------|
| Navigation timeout | Network issues | ✅ Yes | Check internet |
| Login button not found | Page structure changed | ✅ Yes | Update selector |
| Popup timeout | JavaScript error | ✅ Yes | Check console |
| QR button not found | Popup structure changed | ✅ Yes | Update selector |
| Login timeout | User didn't scan | ❌ No | Scan QR code |
| Session save failed | File permissions | ✅ Yes | Check permissions |

### **Error Messages**

All errors return:
```javascript
{
  success: false,
  message: 'Human-readable error message',
  error: Error object with stack trace
}
```

---

## 🧪 Testing Checklist

- [ ] Navigate to homepage successfully
- [ ] Login button is clickable
- [ ] Popup appears after clicking login
- [ ] QR code button is clickable
- [ ] QR code is displayed
- [ ] Login completes after scanning
- [ ] "Logout" button appears
- [ ] Session cookies are saved
- [ ] Can reload page and stay logged in

---

## 🔄 Session Reuse Flow

**Next run** (with saved session):
```javascript
// In src/index.js
const hasSession = await loadSession(context, config.paths.cookies)
if (hasSession && await isSessionValid(page)) {
  // Skip login flow entirely
  success('Using saved session')
} else {
  // Run login flow
  await executeLoginFlow(page)
}
```

**Benefits**:
- No QR code scanning on every run
- Faster execution
- Less manual intervention

---

## 📊 Expected Output

### **Console Output**
```
Step 1/7: Navigating to Anghami homepage...
✓ Homepage loaded
Step 2/7: Clicking login button...
✓ Login button clicked
Step 3/7: Waiting for login popup...
✓ Login popup appeared
Step 4/7: Clicking "Scan QR code" button...
✓ QR code displayed
Step 5/7: Waiting for login completion...
⏳ Please scan the QR code with your Anghami mobile app...
✓ Login successful!
Step 6/7: Saving session cookies...
✓ Session saved
Step 7/7: Verifying login state...
✓ Login verified
```

### **Saved Session File**
```json
// data/session/cookies.json
[
  {
    "name": "session_token",
    "value": "eyJhbGciOiJIUzI1NiIs...",
    "domain": ".anghami.com",
    "path": "/",
    "expires": 1740000000,
    "httpOnly": true,
    "secure": true,
    "sameSite": "Lax"
  }
]
```

---

## 🚀 Next Steps After Login

Once login is successful, you can:
1. Navigate to library/songs page
2. Extract liked songs data
3. Navigate to playlists page
4. Extract playlists data
5. Save all data to structured JSON

---

**Status**: Ready for implementation
**Dependencies**: Requires action blocks to be implemented first
**Estimated Implementation Time**: 30 minutes (after actions are ready)
