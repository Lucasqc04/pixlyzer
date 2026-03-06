import { NextRequest, NextResponse } from 'next/server';
import { logErrorSafe } from '@/lib/utils/logging';
import { PaguebitService, PAYMENT_EXPIRATION_MS } from '@/lib/services/paguebitService';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'USER_NOT_FOUND', message: 'User not found' },
        { status: 404 }
      );
    }

    // Verificar se já é PRO
    if (user.plan === 'PRO') {
      return NextResponse.json(
        { error: 'ALREADY_PRO', message: 'User already has PRO plan' },
        { status: 400 }
      );
    }

    // Criar pagamento
    const payment = await PaguebitService.createProPayment(userId, user.email);

    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        status: payment.status,
        amount: payment.amount,
        qrCodeUrl: payment.qrCodeUrl,
        qrCopyPaste: payment.qrCopyPaste,
        expiresAt: new Date(Date.now() + PAYMENT_EXPIRATION_MS).toISOString(),
      },
    });
  } catch (error: any) {
    logErrorSafe('Create payment error:', error);

    return NextResponse.json(
      { error: 'PAYMENT_ERROR', message: error.message || 'Failed to create payment' },
      { status: 500 }
    );
  }
}
