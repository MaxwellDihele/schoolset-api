import type { VercelResponse } from '@vercel/node';

export function json(res: VercelResponse, status: number, body: unknown): void {
  res.status(status).json(body);
}

export function methodNotAllowed(res: VercelResponse, allowed: string[]): void {
  res.setHeader('Allow', allowed.join(', '));
  json(res, 405, { success: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } });
}

export function internalError(res: VercelResponse, error: unknown): void {
  console.error(error);
  json(res, 500, { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
}
