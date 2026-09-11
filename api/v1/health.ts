import type { VercelRequest, VercelResponse } from '@vercel/node';
import { json, methodNotAllowed } from '../../src/lib/response.js';

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (req.method !== 'GET') {
    methodNotAllowed(res, ['GET']);
    return;
  }

  json(res, 200, {
    success: true,
    service: 'schoolset-api',
    version: 'v1',
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}
