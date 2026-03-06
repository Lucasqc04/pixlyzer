import { NextResponse } from 'next/server';

export const ok = (data: any, status = 200) => NextResponse.json({ ok: true, success: true, data }, { status });
export const fail = (code: string, message: string, status = 400, fields?: Record<string, string[]>) =>
  NextResponse.json({ ok: false, success: false, error: { code, message, ...(fields ? { fields } : {}) } }, { status });
