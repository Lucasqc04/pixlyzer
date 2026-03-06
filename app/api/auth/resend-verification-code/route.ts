import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { EmailService } from '@/lib/services/emailService';

export async function POST(request: NextRequest) {
  const { email } = await request.json();
  if (!email) return NextResponse.json({ ok: false, success: false, error: { code: 'VALIDATION_ERROR', message: 'Email obrigatório' } }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return NextResponse.json({ ok: false, success: false, error: { code: 'NOT_FOUND', message: 'Usuário não encontrado' } }, { status: 404 });
  if (user.emailVerified) return NextResponse.json({ ok: true, success: true, data: { sent: false, reason: 'already_verified' } });

  const code = EmailService.generateVerificationCode();
  await prisma.user.update({ where: { id: user.id }, data: { emailVerificationCode: code, emailVerificationExpiresAt: new Date(Date.now() + 10 * 60 * 1000), emailVerificationAttempts: 0 } });
  await EmailService.sendVerificationCodeEmail(user.email, code);

  return NextResponse.json({ ok: true, success: true, data: { sent: true } });
}
