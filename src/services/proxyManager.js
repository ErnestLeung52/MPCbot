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
      const fileContent = fs.readFileSync(this.proxiesPath, 'utf8');
      
      // Parse text format (IP:PORT:USERNAME:PASSWORD per line)
      const lines = fileContent.split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#')); // Filter empty lines and comments

      const proxiesData = lines.map(line => {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const ip = parts[0];
          const port = parts[1];
          const username = parts[2] || '';
          const password = parts[3] || '';

          return {
            server: `http://${ip}:${port}`,
            username,
            password
          };
        }
        return null;
      }).filter(proxy => proxy !== null);

      // Validate each proxy
      this.proxies = proxiesData.filter((proxy, index) => {
        const isValid = this.validateProxy(proxy);
        if (!isValid) {
          logger.warn(`Invalid proxy at line ${index + 1}, skipping`);
        }
        return isValid;
      });

      this.loaded = true;
      logger.info(`Loaded ${this.proxies.length} valid proxy/proxies`);

      if (this.proxies.length === 0) {
        logger.warn('No valid proxies loaded. Automation will run without proxy.');
      }
    } catch (error) {
      logger.error(`Failed to load proxies: ${error.message}`);
      this.proxies = [];
      this.loaded = true;
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
      logger.warn('Proxy missing "server" field');
      return false;
    }

    // Validate server format (should be http://, https://, or socks5://)
    const validProtocols = ['http://', 'https://', 'socks5://'];
    const hasValidProtocol = validProtocols.some(protocol => 
      proxy.server.toLowerCase().startsWith(protocol)
    );

    if (!hasValidProtocol) {
      logger.warn(`Proxy server must start with http://, https://, or socks5://: ${proxy.server}`);
      return false;
    }

    // Validate basic IP:PORT format in the server URL
    try {
      const url = new URL(proxy.server);
      if (!url.hostname || !url.port) {
        logger.warn(`Invalid proxy format: ${proxy.server}`);
        return false;
      }
    } catch (error) {
      logger.warn(`Invalid proxy URL: ${proxy.server}`);
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
   * Get a random proxy
   * @returns {Object|null} - Proxy configuration object or null if no proxies
   */
  getRandom() {
    if (!this.loaded) {
      this.loadProxies();
    }

    if (this.proxies.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * this.proxies.length);
    const proxy = this.proxies[randomIndex];

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
      logger.warn(`Proxy index ${index} out of range`);
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

  /**
   * Reset the proxy rotation to start from beginning
   * @returns {void}
   */
  reset() {
    this.currentIndex = 0;
  }

  /**
   * Mask proxy URL for logging (hide credentials)
   * @param {string} proxyUrl - Full proxy URL
   * @returns {string} - Masked URL
   * @private
   */
  maskProxyUrl(proxyUrl) {
    try {
      const url = new URL(proxyUrl);
      if (url.username || url.password) {
        return `${url.protocol}//*****:*****@${url.host}`;
      }
      return proxyUrl;
    } catch {
      return proxyUrl;
    }
  }

  /**
   * Format proxy for Playwright/Patchright
   * @param {Object} proxy - Proxy object
   * @returns {Object|null} - Formatted proxy config for browser launch
   */
  formatForBrowser(proxy) {
    if (!proxy) {
      return null;
    }

    const config = {
      server: proxy.server
    };

    if (proxy.username) {
      config.username = proxy.username;
    }

    if (proxy.password) {
      config.password = proxy.password;
    }

    return config;
  }
}

module.exports = new ProxyManager();
