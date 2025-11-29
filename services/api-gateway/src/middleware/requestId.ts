import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
      startTime: number;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const clientRequestId = req.get('X-Request-ID');

  req.requestId = clientRequestId && isValidUUID(clientRequestId)
    ? clientRequestId
    : crypto.randomUUID();

  req.startTime = Date.now();

  res.setHeader('X-Request-ID', req.requestId);
  res.setHeader('X-Server-Time', new Date().toISOString());

  next();
}

function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}
