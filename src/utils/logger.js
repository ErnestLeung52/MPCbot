const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../../config/config');

// Ensure logs directory exists
if (!fs.existsSync(config.logging.dir)) {
  fs.mkdirSync(config.logging.dir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    if (stack) {
      return `[${timestamp}] ${message}\n${stack}`;
    }
    return `[${timestamp}] ${message}`;
  })
);

// Create logger instance (file logging only)
// Console output is now handled by the display utility
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports: [
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(config.logging.dir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    // Separate file for errors
    new winston.transports.File({
      filename: path.join(config.logging.dir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    })
  ]
});

// Add helper methods
logger.separator = () => {
  logger.info('---');
};

logger.logTaskStart = (taskNumber, maxTasks, row, email, code) => {
  logger.info(`Task ${taskNumber}/${maxTasks} | Row ${row} | ${email} | ${code}`);
};

logger.logTaskSuccess = (code, email, row, cardNumber) => {
  logger.info(`SUCCESS: Redeemed ${code} with ${email} for row ${row} | Card: ${cardNumber}`);
};

logger.logTaskFailure = (code, email, row, error) => {
  logger.error(`FAILED: ${code} with ${email} for row ${row} | Error: ${error}`);
};

logger.logTaskError = (taskNumber, status, error) => {
  const msg = error && error.message ? error.message : String(error);
  logger.error(`Task ${taskNumber} [${status}]: ${msg}`, error && error.stack ? { stack: error.stack } : {});
};

module.exports = logger;
