import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../../src/lib/supabase.js';
import { internalError, json, methodNotAllowed } from '../../../src/lib/response.js';
import { validateLicenseSchema } from '../../../src/validation/license.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  const parsed = validateLicenseSchema.safeParse(req.body);
  if (!parsed.success) {
    json(res, 400, { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid license validation request', details: parsed.error.flatten() } });
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { licenseKey, deviceId } = parsed.data;

    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .select('id, school_id, plan, status, starts_at, expires_at')
      .eq('license_key', licenseKey)
      .maybeSingle();

    if (licenseError) throw licenseError;
    if (!license) {
      json(res, 404, { success: false, error: { code: 'LICENSE_NOT_FOUND', message: 'License key was not found' } });
      return;
    }

    const now = new Date();
    const activeByDate = new Date(license.starts_at) <= now && (!license.expires_at || new Date(license.expires_at) > now);
    if (license.status !== 'active' || !activeByDate) {
      json(res, 403, { success: false, error: { code: 'LICENSE_INACTIVE', message: 'License is not active' } });
      return;
    }

    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('id, is_revoked, last_seen_at')
      .eq('license_id', license.id)
      .eq('device_id', deviceId)
      .maybeSingle();

    if (deviceError) throw deviceError;
    if (!device || device.is_revoked) {
      json(res, 403, { success: false, error: { code: 'DEVICE_UNAUTHORIZED', message: 'Device is not authorized' } });
      return;
    }

    const { error: updateError } = await supabase
      .from('devices')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', device.id);

    if (updateError) throw updateError;

    json(res, 200, {
      success: true,
      valid: true,
      license: {
        id: license.id,
        schoolId: license.school_id,
        plan: license.plan,
        status: license.status,
        startsAt: license.starts_at,
        expiresAt: license.expires_at,
      },
      device: {
        id: device.id,
        authorized: true,
      },
    });
  } catch (error) {
    internalError(res, error);
  }
}
