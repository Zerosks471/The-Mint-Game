import winston from 'winston';
import { config } from '../config';

const { combine, timestamp, printf, colorize, json } = winston.format;

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
  return `${timestamp} [${level}] ${message} ${metaStr}`;
});

// Create logger
export const logger = winston.createLogger({
  level: config.NODE_ENV === 'development' ? 'debug' : 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json()
  ),
  defaultMeta: { service: 'admin-dashboard' },
  transports: [
    // Console output
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: 'HH:mm:ss' }),
        consoleFormat
      ),
    }),
    // File output for audit logs
    new winston.transports.File({
      filename: 'logs/admin-audit.log',
      level: 'info',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      format: combine(
        timestamp(),
        json()
      ),
    }),
    // Error file
    new winston.transports.File({
      filename: 'logs/admin-error.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});

// Stream for morgan (if needed)
export const logStream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};
