import { NextResponse } from 'next/server';

export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const payload = await request.json();
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return {};
    }
    return payload as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function readString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback;
}

export function readOptionalString(value: unknown) {
  const normalized = readString(value);
  return normalized || undefined;
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function unauthorized(message = 'Merchant operator authentication is required.') {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function conflict(message: string) {
  return NextResponse.json({ error: message }, { status: 409 });
}
