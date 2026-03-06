import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { email, code } = body;
  if (!email || !code) return NextResponse.json({ ok: false, success: false, error: { code: 'VALIDATION_ERROR', message: 'Email e código são obrigatórios' } }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ ok: false, success: false, error: { code: 'NOT_FOUND', message: 'Usuário não encontrado' } }, { status: 404 });
  if (user.emailVerified) return NextResponse.json({ ok: true, success: true, data: { verified: true } });

  if ((user.emailVerificationAttempts || 0) >= 5) {
    return NextResponse.json({ ok: false, success: false, error: { code: 'TOO_MANY_ATTEMPTS', message: 'Muitas tentativas. Solicite novo código.' } }, { status: 429 });
  }

  const now = new Date();
  if (!user.emailVerificationCode || !user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < now) {
    return NextResponse.json({ ok: false, success: false, error: { code: 'CODE_EXPIRED', message: 'Código expirado' } }, { status: 400 });
  }

  if (user.emailVerificationCode !== String(code)) {
    await prisma.user.update({ where: { id: user.id }, data: { emailVerificationAttempts: { increment: 1 } } });
    return NextResponse.json({ ok: false, success: false, error: { code: 'INVALID_CODE', message: 'Código inválido' } }, { status: 400 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true, emailVerifiedAt: now, emailVerificationCode: null, emailVerificationExpiresAt: null, emailVerificationAttempts: 0 } });

  return NextResponse.json({ ok: true, success: true, data: { verified: true } });
}
