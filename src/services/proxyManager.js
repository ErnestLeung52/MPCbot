const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class ProxyManager {
  constructor() {
    this.proxies = [];
    this.currentIndex = 0;
    this.proxiesPath = path.join(__dirname, '../../config/proxies.json');
    this.loaded = false;
  }

  /**
   * Parse a raw proxy string list (IP:PORT:USER:PASS per line) and save to proxies.json.
   * Each entry is stored with a usedCount of 0.
   * @param {string} rawText - Multi-line proxy string
   * @returns {number} - Number of valid proxies saved
   */
  saveProxiesFromText(rawText) {
    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'));

    const entries = lines
      .map((line) => {
        const parts = line.split(':');
        if (parts.length < 2) return null;
        const [ip, port, username = '', password = ''] = parts;
        const proxy = { server: `http://${ip}:${port}`, username, password };
        return this.validateProxy(proxy) ? { ...proxy, usedCount: 0 } : null;
      })
      .filter(Boolean);

    fs.writeFileSync(this.proxiesPath, JSON.stringify(entries, null, 2), 'utf8');
    logger.info(`Saved ${entries.length} proxies to proxies.json`);

    // Reset in-memory state so loadProxies() re-reads fresh data
    this.proxies = [];
    this.loaded = false;

    return entries.length;
  }

  /**
   * Load proxy list from configuration file
   * @returns {void}
   */
  loadProxies() {
    try {
      // Check if proxies file exists
      if (!fs.existsSync(this.proxiesPath)) {
        logger.warn(
          `Proxies configuration file not found at ${this.proxiesPath}\n` +
          'Please create config/proxies.json with your proxy list (format: IP:PORT:USERNAME:PASSWORD). Using no proxy for now.'
        );
        this.proxies = [];
        this.loaded = true;
        return;
      }

      // Read and parse proxies file
      const fileContent = fs.readFileSync(this.proxiesPath, 'utf8').trim();

      if (!fileContent) {
        this.proxies = [];
        this.loaded = true;
        return;
      }

      // Support both JSON array (new format) and plain text (legacy IP:PORT:USER:PASS per line)
      let proxiesData = [];
      if (fileContent.startsWith('[') || fileContent.startsWith('{')) {
        // JSON format
        const parsed = JSON.parse(fileContent);
        const arr = Array.isArray(parsed) ? parsed : [parsed];
        proxiesData = arr.map((entry) => ({
          server: entry.server,
          username: entry.username || '',
          password: entry.password || '',
          usedCount: entry.usedCount || 0,
        }));
      } else {
        // Legacy plain-text format
        const lines = fileContent
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith('#'));

        proxiesData = lines.map((line) => {
          const parts = line.split(':');
          if (parts.length >= 2) {
            const [ip, port, username = '', password = ''] = parts;
            return { server: `http://${ip}:${port}`, username, password, usedCount: 0 };
          }
          return null;
        }).filter(Boolean);
      }

      // Validate each proxy
      this.proxies = proxiesData.filter((proxy, index) => {
        const isValid = this.validateProxy(proxy);
        if (!isValid) {
          logger.warn(`Invalid proxy at line ${index + 1}, skipping`);
        }
        return isValid;
      });

      this.loaded = true;
      
      if (this.proxies.length === 0) {
        logger.warn('No valid proxies loaded - running without proxy');
      } else {
        logger.info(`✓ Loaded ${this.proxies.length} proxy/proxies`);
      }
    } catch (error) {
      logger.error(`Failed to load proxies: ${error.message}`);
      this.proxies = [];
      this.loaded = true;
    }
  }

  /**
   * Increment the usedCount for a proxy by its server string and persist to disk.
   * Called after a task completes successfully.
   * @param {string} server - The proxy server string (e.g. "http://1.2.3.4:3128")
   */
  incrementUsed(server) {
    try {
      if (!fs.existsSync(this.proxiesPath)) return;
      const fileContent = fs.readFileSync(this.proxiesPath, 'utf8').trim();
      if (!fileContent) return;

      const arr = JSON.parse(fileContent);
      if (!Array.isArray(arr)) return;

      const entry = arr.find((p) => p.server === server);
      if (entry) {
        entry.usedCount = (entry.usedCount || 0) + 1;
        fs.writeFileSync(this.proxiesPath, JSON.stringify(arr, null, 2), 'utf8');
        logger.info(`Proxy ${server} usedCount → ${entry.usedCount}`);
      }

      // Keep in-memory proxies in sync
      const mem = this.proxies.find((p) => p.server === server);
      if (mem) mem.usedCount = (mem.usedCount || 0) + 1;
    } catch (error) {
      logger.warn(`Could not increment proxy usage: ${error.message}`);
    }
  }

  /**
   * Clear all proxies from proxies.json (write empty array).
   */
  clearProxies() {
    try {
      fs.writeFileSync(this.proxiesPath, JSON.stringify([], null, 2), 'utf8');
      this.proxies = [];
      this.loaded = true;
      logger.info('proxies.json cleared after all tasks completed');
    } catch (error) {
      logger.warn(`Could not clear proxies.json: ${error.message}`);
    }
  }

  /**
   * Validate proxy configuration
   * @param {Object} proxy - Proxy object to validate
   * @returns {boolean} - True if valid
   * @private
   */
  validateProxy(proxy) {
    if (!proxy || typeof proxy !== 'object') {
      return false;
    }

    // Check if server is provided
    if (!proxy.server || typeof proxy.server !== 'string') {
      return false;
    }

    // Validate server format (should be http://, https://, or socks5://)
    const validProtocols = ['http://', 'https://', 'socks5://'];
    const hasValidProtocol = validProtocols.some(protocol => 
      proxy.server.toLowerCase().startsWith(protocol)
    );

    if (!hasValidProtocol) {
      return false;
    }

    // Validate basic IP:PORT format in the server URL
    try {
      const url = new URL(proxy.server);
      if (!url.hostname || !url.port) {
        return false;
      }
    } catch (error) {
      return false;
    }

    // Username and password are optional but should be strings if provided
    if (proxy.username !== undefined && typeof proxy.username !== 'string') {
      return false;
    }

    if (proxy.password !== undefined && typeof proxy.password !== 'string') {
      return false;
    }

    return true;
  }

  /**
   * Get the next proxy in rotation
   * @returns {Object|null} - Proxy configuration object or null if no proxies
   */
  getNext() {
    if (!this.loaded) {
      this.loadProxies();
    }

    if (this.proxies.length === 0) {
      return null;
    }

    // Get current proxy
    const proxy = this.proxies[this.currentIndex];

    // Move to next proxy (round-robin)
    this.currentIndex = (this.currentIndex + 1) % this.proxies.length;

    return proxy;
  }

  /**
   * Get proxy at specific index
   * @param {number} index - Index of proxy to get
   * @returns {Object|null} - Proxy configuration object or null
   */
  getByIndex(index) {
    if (!this.loaded) {
      this.loadProxies();
    }

    if (index < 0 || index >= this.proxies.length) {
      return null;
    }

    return this.proxies[index];
  }

  /**
   * Get total number of proxies
   * @returns {number} - Number of loaded proxies
   */
  getCount() {
    if (!this.loaded) {
      this.loadProxies();
    }

    return this.proxies.length;
  }

}

module.exports = new ProxyManager();
