import { z } from 'zod';

export const consumerDeviceSchema = z.object({
  deviceFingerprint: z.string().trim().min(1).max(128).optional(),
});

export const merchantSessionSchema = z.object({
  operatorLabel: z.string().trim().min(1).max(48),
  accessCode: z.string().trim().min(1).max(128),
});

export const merchantConfirmSchema = z.object({
  code: z.string().trim().regex(/^[A-Z0-9]{3}-[A-Z0-9]{3}$/i),
});

export const merchantOfferUpdateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(400),
  reward: z.string().trim().min(1).max(240),
  referralGoal: z.number().int().min(1).max(12),
  redemptionWindowHours: z.number().int().min(1).max(168),
});
