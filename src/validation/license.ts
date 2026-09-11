import { z } from 'zod';

export const activateLicenseSchema = z.object({
  licenseKey: z.string().trim().min(8).max(128),
  deviceId: z.string().trim().min(1).max(255),
});

export const validateLicenseSchema = z.object({
  licenseKey: z.string().trim().min(8).max(128),
  deviceId: z.string().trim().min(1).max(255),
});
