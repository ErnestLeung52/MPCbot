const chalk = require('chalk');
const ora = require('ora');
const figlet = require('figlet');

/**
 * Display utility for beautiful terminal output
 * Handles all console output with colors, spinners, and formatting
 */
class Display {
	/**
	 * Show ASCII art banner at startup
	 */
	showBanner() {
		const banner = figlet.textSync('MPCbot', {
			font: 'Standard',
			horizontalLayout: 'default',
			verticalLayout: 'default',
		});

		console.log(chalk.cyan(banner));
		console.log(chalk.gray('   Built by Onyx Engineering'));
		console.log();
	}

	/**
	 * Show a section header with separator
	 */
	showHeader(text) {
		console.log();
		console.log(chalk.cyan.bold(text));
		console.log(chalk.gray('═'.repeat(60)));
	}

	/**
	 * Show a subsection divider
	 */
	showDivider() {
		console.log(chalk.gray('─'.repeat(60)));
	}

	/**
	 * Show info message (white text)
	 */
	info(message) {
		console.log(chalk.white(message));
	}

	/**
	 * Show success message with checkmark
	 */
	success(message) {
		console.log(chalk.green('✔') + ' ' + chalk.green(message));
	}

	/**
	 * Show error message with X
	 */
	error(message) {
		console.log(chalk.red('✖') + ' ' + chalk.red(message));
	}

	/**
	 * Show warning message with warning symbol
	 */
	warn(message) {
		console.log(chalk.yellow('⚠') + ' ' + chalk.yellow(message));
	}

	/**
	 * Create a spinner for ongoing tasks
	 * @param {string} text - Initial spinner text
	 * @returns {object} Ora spinner instance
	 */
	createSpinner(text) {
		return ora({
			text: text,
			color: 'cyan',
		}).start();
	}

	/**
	 * Show task start info
	 */
	showTaskStartInfo(taskCount, startRow) {
		console.log();
		this.info(`Processing ${chalk.bold(taskCount)} task(s) starting from row ${chalk.bold(startRow)}`);
		console.log();
	}

	/**
	 * Show proxy configuration
	 */
	showProxyConfig(config) {
		console.log();
		this.info(chalk.cyan.bold('Proxy Configuration:'));
		this.info(`  Total Proxies: ${chalk.bold(config.count)}`);
		this.info(`  Uses Per Proxy: ${chalk.bold(config.usesPerProxy)}`);
		this.info(`  Max Tasks: ${chalk.bold(config.maxTasks)}`);
	}

	/**
	 * Show no proxy warning
	 */
	showNoProxyWarning() {
		console.log();
		console.log(chalk.yellow('-'.repeat(60)));
		console.log(chalk.yellow.bold('WARNING: NO PROXIES LOADED'));
		this.warn('The bot will run WITHOUT proxy rotation.');
		this.warn('All tasks will use your direct IP address.');
		console.log(chalk.yellow('-'.repeat(60)));
		console.log();
	}

	/**
	 * Show persistent task completion
	 */
	showTaskSuccess(row, code, email, proxyInfo) {
		let message = chalk.green(`[Row ${chalk.bold(row)}] - Redeemed ${chalk.bold(code)} with ${chalk.bold(email)}`);
		
		if (proxyInfo) {
			message += chalk.green(` - Proxy #${chalk.bold(proxyInfo.index)} - Use ${chalk.bold(proxyInfo.usage + '/' + proxyInfo.max)}`);
		} else {
			message += chalk.green(` - ${chalk.bold('Direct IP')}`);
		}
		
		console.log(chalk.green('✔') + ' ' + message);
	}

	/**
	 * Show proxy usage info
	 */
	showProxyUsage(proxyInfo) {
		this.info(
			`Using Proxy #${chalk.bold(proxyInfo.index + 1)} (Usage: ${proxyInfo.current}/${proxyInfo.max}, Remaining: ${proxyInfo.remaining})`,
		);
	}

	/**
	 * Show task failed
	 */
	showTaskFailed(row, code, email, proxyInfo, error) {
		let message = chalk.red(`[Row ${chalk.bold(row)}] - Failed ${chalk.bold(code)} with ${chalk.bold(email)}`);
		
		if (proxyInfo) {
			message += chalk.red(` - Proxy #${chalk.bold(proxyInfo.index)} - Use ${chalk.bold(proxyInfo.usage + '/' + proxyInfo.max)}`);
		} else {
			message += chalk.red(` - ${chalk.bold('Direct IP')}`);
		}
		
		message += chalk.red(` - ${error}`);
		
		console.log(chalk.red('✖') + ' ' + message);
	}

	/**
	 * Show execution summary at end
	 */
	showExecutionSummary(summary) {
		const minutes = Math.floor(summary.duration / 60000);
		const seconds = Math.floor((summary.duration % 60000) / 1000);

		console.log();
		this.showHeader('EXECUTION SUMMARY');
		this.info(`Total tasks: ${chalk.bold(summary.totalTasks)}`);
		this.info(`Completed: ${chalk.green.bold(summary.completed)}`);
		this.info(`Failed: ${chalk.red.bold(summary.failed)}`);

		if (summary.skipped > 0) {
			this.info(`Skipped (timeout): ${chalk.yellow.bold(summary.skipped)}`);
		}

		this.info(`Duration: ${chalk.bold(`${minutes}m ${seconds}s`)}`);

		if (summary.totalTasks > 0) {
			const successRate = ((summary.completed / summary.totalTasks) * 100).toFixed(1);
			const rateColor = successRate >= 80 ? chalk.green : successRate >= 50 ? chalk.yellow : chalk.red;
			this.info(`Success Rate: ${rateColor.bold(successRate + '%')}`);
		}

		console.log();

		if (summary.proxyUsage) {
			this.info(summary.proxyUsage);
		} else {
			this.info('Proxy Usage: None (ran without proxies)');
		}

		console.log(chalk.cyan('═'.repeat(60)));
	}



	/**
	 * Show max consecutive failures error
	 */
	showMaxFailuresError(consecutive, max) {
		console.log();
		console.log(chalk.red('═'.repeat(60)));
		console.log(chalk.red.bold('STOPPING: Maximum consecutive failures reached'));
		console.log(chalk.red('═'.repeat(60)));
		this.error(`Consecutive failures: ${consecutive}`);
		this.error(`Max allowed: ${max}`);
		console.log();
		this.error('This usually indicates a systemic issue (proxy problems,');
		this.error('website changes, credential issues, etc.)');
		console.log();
		this.error('Please investigate before continuing.');
		console.log(chalk.red('═'.repeat(60)));
	}

	/**
	 * Show graceful shutdown message
	 */
	showShutdown(signal) {
		console.log();
		console.log(chalk.yellow('═'.repeat(60)));
		console.log(chalk.yellow.bold(`${signal} received - Shutting down gracefully...`));
		console.log(chalk.yellow('═'.repeat(60)));
	}

	/**
	 * Show empty line
	 */
	newLine() {
		console.log();
	}
}

// Export singleton instance
module.exports = new Display();
