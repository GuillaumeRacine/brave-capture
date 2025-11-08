# Automated Capture Setup

## Option A: Auto-capture on page load

Automatically capture data when you visit any protocol page.

### Implementation:
Add auto-capture to `content.js`:

```javascript
// Auto-capture after page loads
window.addEventListener('load', () => {
  setTimeout(() => {
    // Auto-capture after 3 seconds (let page fully load)
    const protocol = detectProtocol(window.location.href);
    if (protocol) {
      console.log('🤖 Auto-capturing data for:', protocol);
      // Trigger capture automatically
      chrome.runtime.sendMessage({ action: 'autoCapture' });
    }
  }, 3000);
});
```

**Pros:**
- Fully automated
- Always captures latest data

**Cons:**
- Captures even if you don't want to
- More database writes

---

## Option B: Scheduled auto-refresh

Open protocol pages in background tabs at intervals and auto-capture.

### Implementation:
Add to `background.js`:

```javascript
// Schedule captures every 15 minutes
chrome.alarms.create('autoCaptureAll', {
  periodInMinutes: 15
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'autoCaptureAll') {
    const protocols = [
      'https://www.orca.so/liquidity',
      'https://raydium.io/liquidity-pools/',
      'https://aerodrome.finance/liquidity',
      'https://app.cetus.zone/liquidity',
      // Add more protocol URLs
    ];

    protocols.forEach(url => {
      chrome.tabs.create({ url, active: false }, (tab) => {
        // Auto-close after capture
        setTimeout(() => chrome.tabs.remove(tab.id), 10000);
      });
    });
  }
});
```

**Pros:**
- Fully hands-off
- Regular updates

**Cons:**
- Requires browser to be open
- Opens/closes tabs (can be annoying)

---

## Option C: Server-side automation (Best for 24/7)

Deploy a headless browser on a server that runs 24/7.

### Implementation:
1. **Deploy to Cloud (Heroku, Railway, DigitalOcean)**
2. **Use Puppeteer** to automate browser
3. **Schedule with cron jobs**

This runs independently of your personal browser.

Would you like me to set this up?
