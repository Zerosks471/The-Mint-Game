import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { logger } from '../services/logger';

/**
 * IP Allowlist Middleware
 * Blocks requests from IPs not in the allowlist
 * In production, this should be combined with VPN/private network
 */
export function ipAllowlist(req: Request, res: Response, next: NextFunction) {
  // Get client IP (handles proxies)
  const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

  // Normalize IPv6-mapped IPv4 addresses
  const normalizedIp = clientIp.replace(/^::ffff:/, '');

  // Check if IP is allowed
  const isAllowed = config.ALLOWED_IPS.some(allowedIp => {
    const normalizedAllowed = allowedIp.replace(/^::ffff:/, '');
    return normalizedIp === normalizedAllowed || clientIp === allowedIp;
  });

  // In development, allow all local IPs
  const isLocalDev = config.NODE_ENV === 'development' && (
    normalizedIp === '127.0.0.1' ||
    normalizedIp === 'localhost' ||
    clientIp === '::1' ||
    normalizedIp.startsWith('192.168.') ||
    normalizedIp.startsWith('10.')
  );

  if (!isAllowed && !isLocalDev) {
    logger.warn('Blocked request from unauthorized IP', {
      ip: clientIp,
      normalizedIp,
      path: req.path,
      method: req.method,
    });

    return res.status(403).json({
      success: false,
      error: {
        code: 'IP_NOT_ALLOWED',
        message: 'Access denied',
      },
    });
  }

  next();
}
