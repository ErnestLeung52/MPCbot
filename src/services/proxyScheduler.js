const logger = require('../utils/logger');

/**
 * ProxyScheduler manages round-robin proxy allocation
 * Ensures each proxy is used evenly before reusing any proxy
 *
 * Example: 10 proxies with 3 uses each = 30 tasks
 * Usage pattern: proxy1, proxy2, ..., proxy10, proxy1, proxy2, ..., proxy10, proxy1, ...
 */
class ProxyScheduler {
	constructor(proxies, usesPerProxy) {
		if (!Array.isArray(proxies) || proxies.length === 0) {
			throw new Error('ProxyScheduler requires at least one proxy');
		}

		if (!usesPerProxy || usesPerProxy < 1) {
			throw new Error('usesPerProxy must be at least 1');
		}

		this.proxies = proxies;
		this.usesPerProxy = usesPerProxy;
		this.totalTasks = proxies.length * usesPerProxy;

		// Track usage: { proxyIndex: numberOfTimesUsed }
		this.usageCount = {};
		proxies.forEach((_, index) => {
			this.usageCount[index] = 0;
		});

		// Current position in round-robin cycle
		this.currentCycle = 0;
		this.currentProxyIndex = 0;

		// Track total proxies allocated
		this.totalAllocated = 0;
	}

	/**
	 * Get the next available proxy in round-robin fashion
	 * @returns {Object|null} - Proxy object or null if all exhausted
	 */
	getNext() {
		// Check if all proxies are exhausted
		if (this.totalAllocated >= this.totalTasks) {
			return null;
		}

		// Find next available proxy in current cycle
		let attempts = 0;
		while (attempts < this.proxies.length) {
			const proxyIndex = this.currentProxyIndex;
			const currentUsage = this.usageCount[proxyIndex];

			// Check if this proxy can still be used
			if (currentUsage < this.usesPerProxy) {
				// Allocate this proxy
				const proxy = this.proxies[proxyIndex];
				this.usageCount[proxyIndex]++;
				this.totalAllocated++;

				// Move to next proxy for next call (round-robin)
				this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxies.length;

				// If we've completed a full cycle, increment cycle counter
				if (this.currentProxyIndex === 0) {
					this.currentCycle++;
				}

				return {
					proxy,
					proxyIndex,
					currentUsage: this.usageCount[proxyIndex],
					totalAllocated: this.totalAllocated,
					remaining: this.totalTasks - this.totalAllocated,
				};
			}

			// This proxy is exhausted, try next one
			this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxies.length;
			attempts++;
		}

		// All proxies exhausted
		return null;
	}

	/**
	 * Get total number of tasks that can be processed
	 * @returns {number}
	 */
	getTotalTasks() {
		return this.totalTasks;
	}

	/**
	 * Check if there are more proxies available
	 * @returns {boolean}
	 */
	hasMore() {
		return this.totalAllocated < this.totalTasks;
	}

	/**
	 * Get usage summary for logging
	 * @returns {string}
	 */
	// getUsageSummary() {
	// 	const lines = [];
	// 	lines.push(`Proxy Usage Summary:`);
	// 	lines.push(`Total Proxies: ${this.proxies.length}`);
	// 	lines.push(`Uses Per Proxy: ${this.usesPerProxy}`);
	// 	lines.push(`Total Tasks: ${this.totalTasks}`);
	// 	lines.push(`Allocated: ${this.totalAllocated}`);
	// 	lines.push(`Remaining: ${this.totalTasks - this.totalAllocated}`);

	// 	if (this.totalAllocated > 0) {
	// 		lines.push(`Current Cycle: ${this.currentCycle + 1}/${this.usesPerProxy}`);
	// 	}

	// 	return lines.join('\n');
	// }
}

module.exports = ProxyScheduler;
