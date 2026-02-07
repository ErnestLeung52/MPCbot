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
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    if (stack) {
      return `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`;
    }
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      )
    }),
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
logger.logTaskStart = (taskNumber, totalTasks) => {
  logger.info(`Starting task ${taskNumber}/${totalTasks}`);
};

logger.logTaskComplete = (taskNumber, totalTasks, duration) => {
  logger.info(`Task ${taskNumber}/${totalTasks} completed successfully in ${duration}ms`);
};

logger.logTaskError = (taskNumber, totalTasks, error) => {
  logger.error(`Task ${taskNumber}/${totalTasks} failed: ${error.message}`);
};

module.exports = logger;
