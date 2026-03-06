import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');

  if (!token) return NextResponse.json({ error: 'TOKEN_REQUIRED' }, { status: 400 });

  const verification = await prisma.emailVerificationToken.findUnique({ where: { token } });

  if (!verification || verification.expiresAt < new Date()) {
    return NextResponse.json({ error: 'INVALID_OR_EXPIRED_TOKEN' }, { status: 400 });
  }

  await prisma.user.update({ where: { id: verification.userId }, data: { emailVerified: true } });
  await prisma.emailVerificationToken.delete({ where: { id: verification.id } });

  return NextResponse.redirect(new URL('/dashboard?emailVerified=1', request.url));
}
