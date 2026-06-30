import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger.js';
import { errorResponse } from '../models/schemas.js';

/**
 * Global error handler. Catches all unhandled errors from route handlers.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    const messages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    res.status(400).json(errorResponse(`Validation error: ${messages.join('; ')}`));
    return;
  }

  // Known application errors
  if (err.message.startsWith('NOT_FOUND:')) {
    res.status(404).json(errorResponse(err.message.replace('NOT_FOUND:', '').trim()));
    return;
  }

  if (err.message.startsWith('CONFLICT:')) {
    res.status(409).json(errorResponse(err.message.replace('CONFLICT:', '').trim()));
    return;
  }

  // Unexpected errors
  logger.error({ err }, 'Unhandled error');
  res.status(500).json(
    errorResponse(
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
    ),
  );
}
