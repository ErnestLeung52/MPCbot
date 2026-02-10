# Proxy Configuration Guide

## Overview

This bot supports proxy rotation to help avoid detection and IP-based rate limiting. Proxies are automatically rotated for each task and applied to all browser sessions, including detection tests.

## Setup Instructions

### 1. Create Proxy Configuration File

Copy the example file and add your proxies:

```bash
cp config/proxies.example.json config/proxies.json
```

### 2. Add Your Proxies

Edit `config/proxies.json` and add your proxies in this format:

```
IP:PORT:USERNAME:PASSWORD
```

**Example:**
```
13.57.57.178:3128:myuser:mypassword
18.144.14.18:3128:myuser:mypassword
13.56.247.3:3128:myuser:mypassword
```

**Rules:**
- One proxy per line
- Use format: `IP:PORT:USERNAME:PASSWORD`
- Lines starting with `#` are ignored (comments)
- Empty lines are ignored
- If your proxy doesn't require authentication, use: `IP:PORT::`

### 3. Test Your Proxies

Run the proxy test to verify everything is working:

```bash
npm run test-proxy
```

This will:
- ✅ Load your proxies from config
- ✅ Launch browser with first proxy
- ✅ Check your IP address via ipify.org
- ✅ Verify IP matches your proxy
- ✅ Show location and ISP information

**Expected Output:**
```
✓ Loaded 3 proxy/proxies
Selected proxy configuration:
  Server: http://13.57.57.178:3128
  Username: ****
  Password: ****

✓ Browser launched successfully with proxy

Test 1: Checking IP address...
  Your IP: 13.57.57.178

✅ SUCCESS: IP matches proxy! Proxy is working correctly.
```

### 4. Test with Detection Sites

Verify proxies work with anti-bot detection:

```bash
npm run test-detection
```

The test will automatically use your configured proxies if available.

## How Proxies Are Used

### Main Bot (Production)

When running the main bot (`npm start`), proxies are automatically applied:

1. **Proxy Loading**: On startup, proxies are loaded from `config/proxies.json`
2. **Rotation**: Each task gets the next proxy in round-robin rotation
3. **Browser Launch**: The selected proxy is passed to Patchright
4. **All Requests**: All browser requests go through the proxy

**Code Flow:**
```javascript
// src/index.js
const proxy = proxyManager.getNext();  // Get next proxy
browser = await browserService.launch(proxy);  // Launch with proxy
```

### Detection Tests

When running detection tests (`npm run test-detection`), proxies are used if configured:

```javascript
// test-detection.js
proxyManager.loadProxies();
const proxy = useProxy ? proxyManager.getNext() : null;
browser = await browserService.launch(proxy);
```

### Browser Service Implementation

The browser service applies proxies to Patchright:

```javascript
// src/services/browser.js
if (proxy) {
  launchOptions.proxy = {
    server: proxy.server,      // e.g., "http://13.57.57.178:3128"
    username: proxy.username,  // Authentication
    password: proxy.password   // Authentication
  };
}

// Launch with proxy configuration
await chromium.launchPersistentContext(userDataDir, launchOptions);
```

## Proxy Types Supported

### HTTP/HTTPS Proxies
```
IP:PORT:USERNAME:PASSWORD
```
Automatically formatted as: `http://IP:PORT`

### SOCKS5 Proxies
If you need SOCKS5 support, modify the proxy URL in `src/services/proxyManager.js`:

```javascript
return {
  server: `socks5://${ip}:${port}`,  // Change to socks5://
  username,
  password
};
```

## Troubleshooting

### No Proxies Loaded

**Issue:** "No proxies loaded" or "No valid proxies"

**Solutions:**
1. Verify file exists: `config/proxies.json` (not `.example.json`)
2. Check file format (one proxy per line)
3. Ensure no syntax errors in the file
4. Check file permissions (readable)

### Proxy Not Working

**Issue:** IP doesn't match proxy or connection fails

**Solutions:**
1. Verify proxy credentials are correct
2. Test proxy server is online and responding
3. Check proxy supports HTTP/HTTPS traffic
4. Verify no firewall blocking the proxy connection
5. Try a different proxy from your list

### Authentication Failed

**Issue:** Proxy requires authentication but not connecting

**Solutions:**
1. Double-check username and password
2. Ensure format is: `IP:PORT:USERNAME:PASSWORD`
3. No extra spaces or special characters
4. Username/password may be URL-encoded

### Connection Timeout

**Issue:** Browser times out when loading pages

**Solutions:**
1. Proxy server might be slow or down
2. Try increasing timeout in config
3. Test proxy manually with curl:
   ```bash
   curl -x http://username:password@IP:PORT https://api.ipify.org
   ```

## Best Practices

### 1. Residential Proxies Recommended
- Datacenter IPs are more easily detected
- Residential IPs appear as real users
- Consider rotating residential proxy services

### 2. Proxy Rotation
- Use multiple proxies to avoid rate limits
- The bot automatically rotates in round-robin fashion
- Each task gets a different proxy

### 3. Monitor Proxy Health
- Regularly test proxies with `npm run test-proxy`
- Remove dead proxies from config
- Monitor for authentication failures

### 4. Security
- Never commit `proxies.json` to version control
- File is already in `.gitignore` for safety
- Keep credentials secure and encrypted

### 5. Performance
- Use fast, low-latency proxies
- Slow proxies will significantly impact bot speed
- Test proxy speed before adding to config

## Proxy Services

Popular proxy providers (not affiliated):
- **Bright Data** (formerly Luminati) - Residential/Datacenter
- **Smartproxy** - Residential proxies
- **Oxylabs** - Premium proxies
- **ProxyMesh** - Rotating proxies
- **IPRoyal** - Affordable residential

## Configuration Summary

| File | Purpose | Tracked by Git |
|------|---------|----------------|
| `config/proxies.json` | Your actual proxies | ❌ No (in .gitignore) |
| `config/proxies.example.json` | Template/example | ✅ Yes |

## Testing Commands

```bash
# Test proxy configuration
npm run test-proxy

# Test with detection sites (uses proxies automatically)
npm run test-detection

# Run main bot (uses proxies automatically)
npm start
```

## Support

If proxies still aren't working after following this guide:
1. Run `npm run test-proxy` and share the output
2. Check the logs in `logs/` directory
3. Verify proxy format matches examples exactly
4. Test proxy manually with curl or browser extensions
