const chalk = require('chalk');
const figlet = require('figlet');
const { Listr } = require('listr2');

const DIM = chalk.gray('·');
const PIPE = chalk.gray('│');

class Display {
	showBanner() {
		const banner = figlet.textSync('MPCbot', {
			font: 'Standard',
			horizontalLayout: 'default',
			verticalLayout: 'default',
		});
		console.log(chalk.cyan(banner));
		console.log(chalk.dim('  Built by Onyx Engineering'));
		console.log();
	}

	// ─── primitives ────────────────────────────────────────────────────────────

	info(message) {
		console.log(chalk.white(message));
	}

	success(message) {
		console.log(chalk.green('✔') + '  ' + chalk.green(message));
	}

	error(message) {
		console.log(chalk.red('✖') + '  ' + chalk.red(message));
	}

	warn(message) {
		console.log(chalk.yellow('⚠') + '  ' + chalk.yellow(message));
	}

	newLine() {
		console.log();
	}

	// ─── section header ─────────────────────────────────────────────────────────

	showHeader(text) {
		console.log();
		console.log(chalk.cyan.bold(text));
		console.log(chalk.gray('─'.repeat(48)));
	}

	showDivider() {
		console.log(chalk.gray('─'.repeat(48)));
	}

	// ─── spinner ────────────────────────────────────────────────────────────────

	createSpinner(text) {
		const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
		let frameIndex = 0;
		let currentText = text;
		let isRunning = false;
		let interval;

		const spinner = {
			start() {
				isRunning = true;
				process.stdout.write('\n');
				interval = setInterval(() => {
					if (isRunning) {
						process.stdout.write(`\r  ${chalk.cyan(frames[frameIndex])} ${chalk.dim(currentText)}`);
						frameIndex = (frameIndex + 1) % frames.length;
					}
				}, 80);
				return this;
			},
			succeed(msg) {
				this.stop();
				process.stdout.write(`\r  ${chalk.green('✔')} ${chalk.white(msg)}\n`);
			},
			fail(msg) {
				this.stop();
				process.stdout.write(`\r  ${chalk.red('✖')} ${chalk.red(msg)}\n`);
			},
			warn(msg) {
				this.stop();
				process.stdout.write(`\r  ${chalk.yellow('⚠')} ${chalk.yellow(msg)}\n`);
			},
			stop() {
				isRunning = false;
				if (interval) {
					clearInterval(interval);
					process.stdout.write('\r\x1b[K');
				}
			},
			set text(value) {
				currentText = value;
			},
		};

		return spinner.start();
	}

	// ─── listr2 task runner ──────────────────────────────────────────────────────

	createTaskRunner(tasks, concurrent = 3) {
		return new Listr(tasks, {
			concurrent,
			exitOnError: false,
			rendererOptions: {
				collapseSubtasks: false,
				showSubtasks: false, // Don't show subtask output - prevents expansion
				suffixSkips: false,
				collapseErrors: false,
			},
		});
	}

	// ─── questions & prompts ─────────────────────────────────────────────────────

	showQuestion(text, hint = '') {
		console.log();
		console.log(chalk.cyan('┌─ ') + chalk.cyan.bold(text));
		if (hint) {
			console.log(chalk.cyan('│  ') + chalk.dim(hint));
		}
		console.log(chalk.cyan('└─'));
	}

	showQuestionResult(label, value) {
		console.log(chalk.dim('  → ') + chalk.dim(label + ': ') + chalk.white.bold(value));
		console.log();
	}

	showProxyList(proxies) {
		if (proxies.length === 0) {
			console.log(chalk.dim('  → No proxies configured'));
			return;
		}

		console.log(chalk.dim('  → Loaded ') + chalk.white.bold(proxies.length) + chalk.dim(' proxy(ies)'));
		proxies.forEach((proxy, idx) => {
			const maskedUser = proxy.username ? proxy.username.substring(0, 3) + '***' : '';
			const proxyStr = `${proxy.host}:${proxy.port}${maskedUser ? ' (' + maskedUser + ')' : ''}`;
			console.log(chalk.dim(`     ${idx + 1}. `) + chalk.gray(proxyStr));
		});
		console.log();
	}

	// ─── init ────────────────────────────────────────────────────────────────────

	showTaskStartInfo(taskCount, startRow) {
		console.log(
			chalk.dim('  → Running ') +
				chalk.white.bold(taskCount) +
				chalk.dim(' task(s) from row ') +
				chalk.white.bold(startRow),
		);
		console.log();
	}

	showProxyConfig(config) {
		console.log(
			chalk.dim('  Proxies: ') +
				chalk.white.bold(config.count) +
				chalk.dim('  ×  uses/proxy: ') +
				chalk.white.bold(config.usesPerProxy) +
				chalk.dim('  →  max tasks: ') +
				chalk.white.bold(config.maxTasks),
		);
	}

	showNoProxyWarning() {
		console.log();
		console.log(chalk.yellow('  ⚠  No proxies loaded — running on direct IP'));
		console.log();
	}

	// ─── execution summary ───────────────────────────────────────────────────────

	showExecutionSummary(summary) {
		const minutes = Math.floor(summary.duration / 60000);
		const seconds = Math.floor((summary.duration % 60000) / 1000);
		const durationStr = `${minutes}m ${seconds}s`;

		let rateStr = '';
		if (summary.totalTasks > 0) {
			const rate = ((summary.completed / summary.totalTasks) * 100).toFixed(1);
			const rateColor = rate >= 80 ? chalk.green : rate >= 50 ? chalk.yellow : chalk.red;
			rateStr = rateColor.bold(rate + '%');
		}

		console.log();
		console.log(chalk.cyan.bold('Execution Summary'));
		console.log(chalk.gray('  ─'.padEnd(50, '─')));
		console.log(
			chalk.dim('Tasks   ') +
				chalk.white.bold(summary.completed) +
				chalk.dim(' completed') +
				'  ' +
				chalk.gray(DIM) +
				'  ' +
				chalk.red.bold(summary.failed) +
				chalk.dim(' failed') +
				(summary.skipped > 0
					? '  ' + chalk.gray(DIM) + '  ' + chalk.yellow.bold(summary.skipped) + chalk.dim(' skipped')
					: ''),
		);
		console.log(chalk.dim('Rate    ') + (rateStr || chalk.dim('n/a')));
		console.log(chalk.dim('Time    ') + chalk.white(durationStr));
		console.log(chalk.gray('─'.padEnd(50, '─')));
	}

	// ─── error states ────────────────────────────────────────────────────────────

	showMaxFailuresError(consecutive, max) {
		console.log();
		console.log(chalk.red('  ✖  Stopped — max consecutive failures reached'));
		console.log(chalk.dim(`     ${consecutive}/${max} failures`));
		console.log(chalk.dim('     Check proxies, credentials, or site changes.'));
		console.log();
	}

	showShutdown(signal) {
		console.log();
		console.log(chalk.yellow(`  ⚠  ${signal} — shutting down...`));
	}

	// ─── legacy helpers (kept for compatibility) ─────────────────────────────────

	showTaskSuccess(row, code, email, proxyInfo) {
		let message = chalk.green(`[Row ${chalk.bold(row)}] - Redeemed ${chalk.bold(code)} with ${chalk.bold(email)}`);

		if (proxyInfo) {
			message += chalk.green(
				` - Proxy #${chalk.bold(proxyInfo.index)} - Use ${chalk.bold(proxyInfo.usage + '/' + proxyInfo.max)}`,
			);
		} else {
			message += chalk.green(` - ${chalk.bold('Direct IP')}`);
		}

		console.log(chalk.green('✔') + ' ' + message);
	}

	showTaskFailed(row, code, email, proxyInfo, err) {
		let message = chalk.red(`[Row ${chalk.bold(row)}] - Failed ${chalk.bold(code)} with ${chalk.bold(email)}`);

		if (proxyInfo) {
			message += chalk.red(
				` - Proxy #${chalk.bold(proxyInfo.index)} - Use ${chalk.bold(proxyInfo.usage + '/' + proxyInfo.max)}`,
			);
		} else {
			message += chalk.red(` - ${chalk.bold('Direct IP')}`);
		}

		message += chalk.red(` - ${err}`);

		console.log(chalk.red('✖') + ' ' + message);
	}

	showProxyUsage(proxyInfo) {
		this.info(
			chalk.dim(`  Proxy #${proxyInfo.index + 1}`) +
				chalk.dim(` (${proxyInfo.current}/${proxyInfo.max}, ${proxyInfo.remaining} remaining)`),
		);
	}
}

module.exports = new Display();
