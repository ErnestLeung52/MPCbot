const { chromium } = require('patchright');
const config = require('../../config/config');
const logger = require('../utils/logger');

class BrowserService {
  constructor() {
    this.browser = null;
  }

  /**
   * Get random user agent from config
   * @returns {string} - Random user agent string
   * @private
   */
  getRandomUserAgent() {
    const userAgents = config.browser.userAgents;
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  /**
   * Get random viewport size from config
   * @returns {Object} - Viewport size { width, height }
   * @private
   */
  getRandomViewport() {
    const viewports = config.browser.viewportSizes;
    return viewports[Math.floor(Math.random() * viewports.length)];
  }

  /**
   * Get random timezone offset
   * @returns {string} - Timezone ID
   * @private
   */
  getRandomTimezone() {
    const timezones = [
      'America/New_York',
      'America/Chicago',
      'America/Los_Angeles',
      'America/Denver',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Australia/Sydney'
    ];
    return timezones[Math.floor(Math.random() * timezones.length)];
  }

  /**
   * Launch browser with stealth configuration
   * @param {Object} proxy - Proxy configuration (optional)
   * @returns {Promise<Browser>} - Patchright browser instance
   */
  async launch(proxy = null) {
    try {
      const userAgent = this.getRandomUserAgent();
      const viewport = this.getRandomViewport();
      const timezone = this.getRandomTimezone();

      // Build launch options
      const launchOptions = {
        headless: config.browser.headless,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-dev-shm-usage',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-site-isolation-trials',
          `--window-size=${viewport.width},${viewport.height}`
        ]
      };

      // Add proxy if provided
      if (proxy) {
        launchOptions.proxy = {
          server: proxy.server
        };
        
        if (proxy.username) {
          launchOptions.proxy.username = proxy.username;
        }
        
        if (proxy.password) {
          launchOptions.proxy.password = proxy.password;
        }

        logger.debug('Launching browser with proxy');
      } else {
        logger.debug('Launching browser without proxy');
      }

      // Launch browser
      this.browser = await chromium.launch(launchOptions);

      logger.info('Browser launched successfully');
      return this.browser;
    } catch (error) {
      logger.error(`Failed to launch browser: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a new page with stealth settings
   * @param {Browser} browser - Browser instance
   * @returns {Promise<Page>} - Patchright page instance
   */
  async createPage(browser) {
    try {
      const userAgent = this.getRandomUserAgent();
      const viewport = this.getRandomViewport();
      const timezone = this.getRandomTimezone();

      // Create new context with stealth settings
      const context = await browser.newContext({
        userAgent,
        viewport,
        timezoneId: timezone,
        locale: 'en-US',
        colorScheme: 'light',
        permissions: [],
        geolocation: undefined,
        extraHTTPHeaders: {
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
      });

      // Create page
      const page = await context.newPage();

      // Additional stealth measures
      await this.applyStealthScripts(page);

      logger.debug(`New page created with viewport ${viewport.width}x${viewport.height}`);
      return page;
    } catch (error) {
      logger.error(`Failed to create page: ${error.message}`);
      throw error;
    }
  }

  /**
   * Apply additional stealth scripts to the page
   * @param {Page} page - Patchright page instance
   * @returns {Promise<void>}
   * @private
   */
  async applyStealthScripts(page) {
    try {
      // Override navigator properties to appear more human-like
      await page.addInitScript(() => {
        // Override the navigator.webdriver property
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined
        });

        // Mock plugins
        Object.defineProperty(navigator, 'plugins', {
          get: () => [
            {
              0: { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format' },
              description: 'Portable Document Format',
              filename: 'internal-pdf-viewer',
              length: 1,
              name: 'Chrome PDF Plugin'
            },
            {
              0: { type: 'application/pdf', suffixes: 'pdf', description: '' },
              description: '',
              filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
              length: 1,
              name: 'Chrome PDF Viewer'
            }
          ]
        });

        // Mock languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en']
        });

        // Mock hardware concurrency
        Object.defineProperty(navigator, 'hardwareConcurrency', {
          get: () => 8
        });

        // Mock device memory
        Object.defineProperty(navigator, 'deviceMemory', {
          get: () => 8
        });

        // Override permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission }) :
            originalQuery(parameters)
        );

        // Add chrome runtime
        window.chrome = {
          runtime: {}
        };

        // Mock battery API
        if ('getBattery' in navigator) {
          navigator.getBattery = () => Promise.resolve({
            charging: true,
            chargingTime: 0,
            dischargingTime: Infinity,
            level: 1
          });
        }
      });

      logger.debug('Stealth scripts applied');
    } catch (error) {
      logger.error(`Failed to apply stealth scripts: ${error.message}`);
      // Don't throw - continue even if stealth scripts fail
    }
  }

  /**
   * Close browser instance
   * @param {Browser} browser - Browser to close
   * @returns {Promise<void>}
   */
  async close(browser) {
    try {
      if (browser) {
        await browser.close();
        logger.debug('Browser closed');
      }
    } catch (error) {
      logger.error(`Error closing browser: ${error.message}`);
    }
  }

  /**
   * Get browser instance
   * @returns {Browser|null} - Current browser instance
   */
  getBrowser() {
    return this.browser;
  }
}

module.exports = new BrowserService();
