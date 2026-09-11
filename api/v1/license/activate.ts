import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../../../src/lib/supabase.js';
import { internalError, json, methodNotAllowed } from '../../../src/lib/response.js';
import { activateLicenseSchema } from '../../../src/validation/license.js';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    methodNotAllowed(res, ['POST']);
    return;
  }

  const parsed = activateLicenseSchema.safeParse(req.body);
  if (!parsed.success) {
    json(res, 400, { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid license activation request', details: parsed.error.flatten() } });
    return;
  }

  try {
    const supabase = getSupabaseAdmin();
    const { licenseKey, deviceId } = parsed.data;

    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .select('id, school_id, plan, status, max_devices, starts_at, expires_at')
      .eq('license_key', licenseKey)
      .maybeSingle();

    if (licenseError) throw licenseError;
    if (!license) {
      json(res, 404, { success: false, error: { code: 'LICENSE_NOT_FOUND', message: 'License key was not found' } });
      return;
    }

    const now = new Date();
    const startsAt = new Date(license.starts_at);
    const expiresAt = license.expires_at ? new Date(license.expires_at) : null;
    const activeByDate = startsAt <= now && (!expiresAt || expiresAt > now);

    if (license.status !== 'active' || !activeByDate) {
      json(res, 403, { success: false, error: { code: 'LICENSE_INACTIVE', message: 'License is not active' } });
      return;
    }

    const { data: school, error: schoolError } = await supabase
      .from('schools')
      .select('id, name, emis_number, address, phone, email, logo_url')
      .eq('id', license.school_id)
      .eq('is_active', true)
      .maybeSingle();

    if (schoolError) throw schoolError;
    if (!school) {
      json(res, 403, { success: false, error: { code: 'SCHOOL_INACTIVE', message: 'School is not active' } });
      return;
    }

    const { data: deviceResult, error: deviceError } = await supabase.rpc('activate_license_device', {
      p_license_id: license.id,
      p_school_id: license.school_id,
      p_device_id: deviceId,
      p_device_name: null,
      p_max_devices: license.max_devices,
    });

    if (deviceError) throw deviceError;

    const device = Array.isArray(deviceResult) ? deviceResult[0] : deviceResult;
    if (!device?.device_authorized) {
      json(res, 403, { success: false, error: { code: device?.device_limit_reached ? 'DEVICE_LIMIT_REACHED' : 'DEVICE_REVOKED', message: device?.device_limit_reached ? 'The maximum number of devices has been reached' : 'This device is not authorized' } });
      return;
    }

    json(res, 200, {
      success: true,
      school,
      license: {
        id: license.id,
        plan: license.plan,
        status: license.status,
        startsAt: license.starts_at,
        expiresAt: license.expires_at,
      },
      device: {
        id: device.device_uuid,
        authorized: true,
      },
    });
  } catch (error) {
    internalError(res, error);
  }
}
