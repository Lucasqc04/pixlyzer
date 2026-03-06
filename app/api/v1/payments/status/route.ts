import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PAYMENT_EXPIRATION_MS, PaguebitService } from '@/lib/services/paguebitService';

export async function GET(request: NextRequest) {
  const paymentId = request.nextUrl.searchParams.get('id');
  if (!paymentId) {
    return NextResponse.json({ error: 'MISSING_ID', message: 'ID do pagamento é obrigatório' }, { status: 400 });
  }

  const localPayment = await prisma.payment.findUnique({
    where: { paguebitPaymentId: paymentId },
  });

  if (localPayment) {
    const isExpired = Date.now() - new Date(localPayment.createdAt).getTime() > PAYMENT_EXPIRATION_MS;
    if (isExpired && localPayment.status !== 'APPROVED') {
      if (localPayment.status === 'PENDING' || localPayment.status === 'PROCESSING') {
        await prisma.payment.update({
          where: { id: localPayment.id },
          data: { status: 'CANCELLED' },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          id: paymentId,
          status: 'CANCELLED',
          expired: true,
          message: 'Tempo para pagamento expirado (10 minutos). Gere um novo PIX.',
        },
      });
    }
  }

  try {
    const payment = await PaguebitService.getPayment(paymentId);
    return NextResponse.json({ success: true, data: payment });
  } catch (error: any) {
    return NextResponse.json({ error: 'NOT_FOUND', message: error.message }, { status: 404 });
  }
}
