import { Response, NextFunction } from 'express';
import { AdminRequest } from './adminAuth';
import { logger } from '../services/logger';
import { v4 as uuidv4 } from 'uuid';

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  adminId: string;
  adminUsername: string;
  action: string;
  resource: string;
  resourceId?: string;
  method: string;
  path: string;
  ip: string;
  userAgent?: string;
  requestBody?: Record<string, unknown>;
  responseStatus?: number;
  duration?: number;
}

// In-memory audit log for now (in production, this would go to a database or external service)
const auditLogs: AuditLogEntry[] = [];
const MAX_LOGS = 10000;

/**
 * Audit Log Middleware
 * Records all admin actions for security and compliance
 */
export function auditLog(req: AdminRequest, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const logId = uuidv4();

  // Create initial log entry
  const entry: AuditLogEntry = {
    id: logId,
    timestamp: new Date(),
    adminId: req.admin?.id || 'unknown',
    adminUsername: req.admin?.username || 'unknown',
    action: getActionFromMethod(req.method),
    resource: getResourceFromPath(req.path),
    resourceId: extractResourceId(req.path),
    method: req.method,
    path: req.path,
    ip: req.ip || 'unknown',
    userAgent: req.headers['user-agent'],
    // Only log safe request body fields (exclude passwords, tokens)
    requestBody: sanitizeRequestBody(req.body),
  };

  // Capture response status when finished
  res.on('finish', () => {
    entry.responseStatus = res.statusCode;
    entry.duration = Date.now() - startTime;

    // Add to in-memory log
    auditLogs.unshift(entry);
    if (auditLogs.length > MAX_LOGS) {
      auditLogs.pop();
    }

    // Log to winston for persistence
    logger.info('AUDIT', entry);
  });

  next();
}

/**
 * Get recent audit logs
 */
export function getAuditLogs(options: {
  limit?: number;
  offset?: number;
  adminId?: string;
  action?: string;
  resource?: string;
} = {}): { logs: AuditLogEntry[]; total: number } {
  let filtered = [...auditLogs];

  if (options.adminId) {
    filtered = filtered.filter(log => log.adminId === options.adminId);
  }
  if (options.action) {
    filtered = filtered.filter(log => log.action === options.action);
  }
  if (options.resource) {
    filtered = filtered.filter(log => log.resource === options.resource);
  }

  const total = filtered.length;
  const offset = options.offset || 0;
  const limit = options.limit || 50;

  return {
    logs: filtered.slice(offset, offset + limit),
    total,
  };
}

function getActionFromMethod(method: string): string {
  const actionMap: Record<string, string> = {
    GET: 'view',
    POST: 'create',
    PUT: 'update',
    PATCH: 'update',
    DELETE: 'delete',
  };
  return actionMap[method] || 'unknown';
}

function getResourceFromPath(path: string): string {
  // Extract resource type from path: /api/admin/users/123 -> users
  const parts = path.split('/').filter(Boolean);
  const adminIndex = parts.indexOf('admin');
  if (adminIndex !== -1) {
    const resource = parts[adminIndex + 1];
    if (resource) return resource;
  }
  return parts[parts.length - 1] ?? 'unknown';
}

function extractResourceId(path: string): string | undefined {
  // Extract UUID or numeric ID from path
  const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const match = path.match(uuidRegex);
  if (match) return match[0];

  // Check for numeric ID at end of path
  const parts = path.split('/');
  const lastPart = parts[parts.length - 1];
  if (lastPart && /^\d+$/.test(lastPart)) return lastPart;

  return undefined;
}

function sanitizeRequestBody(body: unknown): Record<string, unknown> | undefined {
  if (!body || typeof body !== 'object') return undefined;

  const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'authorization'];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
