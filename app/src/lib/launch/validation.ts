export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string; details?: Record<string, unknown> };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function stringField(body: Record<string, unknown>, key: string, maxLength: number, required = true) {
  const value = body[key];
  if (typeof value !== 'string') {
    return required ? null : '';
  }
  return value.trim().slice(0, maxLength);
}

export function validateReferralCreate(body: unknown): ValidationResult<{
  sessionId: string;
  displayName: string;
  deviceFingerprint: string;
}> {
  if (!isRecord(body)) {
    return { ok: false, message: 'JSON body is required.' };
  }
  const sessionId = stringField(body, 'sessionId', 96);
  const displayName = stringField(body, 'displayName', 48);
  const deviceFingerprint = stringField(body, 'deviceFingerprint', 160);
  if (!sessionId || !displayName || !deviceFingerprint) {
    return { ok: false, message: 'sessionId, displayName, and deviceFingerprint are required.' };
  }
  return { ok: true, value: { sessionId, displayName, deviceFingerprint } };
}

export function validateRedeemCodeBody(body: unknown): ValidationResult<{ code: string; staffPin?: string; reason?: string; manualReceiptId?: string }> {
  if (!isRecord(body)) {
    return { ok: false, message: 'JSON body is required.' };
  }
  const code = stringField(body, 'code', 16);
  if (!code) {
    return { ok: false, message: 'code is required.' };
  }
  return {
    ok: true,
    value: {
      code,
      staffPin: stringField(body, 'staffPin', 80, false) || undefined,
      reason: stringField(body, 'reason', 160, false) || undefined,
      manualReceiptId: stringField(body, 'manualReceiptId', 80, false) || undefined,
    },
  };
}

export function validateMerchantLogin(body: unknown): ValidationResult<{ staffPin: string; accessToken: string; role: 'owner' | 'admin' | 'manager' | 'staff' | 'support' | 'auditor'; label: string }> {
  if (!isRecord(body)) {
    return { ok: false, message: 'JSON body is required.' };
  }
  const staffPin = stringField(body, 'staffPin', 80);
  const accessToken = stringField(body, 'accessToken', 160, false);
  const rawRole = stringField(body, 'role', 16, false);
  const role =
    rawRole === 'owner' ||
    rawRole === 'admin' ||
    rawRole === 'manager' ||
    rawRole === 'staff' ||
    rawRole === 'support' ||
    rawRole === 'auditor'
      ? rawRole
      : 'staff';
  const label = stringField(body, 'label', 48, false) || 'Front counter staff';
  if (!staffPin && !accessToken) {
    return { ok: false, message: 'accessToken is required for production login; staffPin is allowed only in local demo mode.' };
  }
  return { ok: true, value: { staffPin: staffPin ?? '', accessToken: accessToken ?? '', role, label } };
}
