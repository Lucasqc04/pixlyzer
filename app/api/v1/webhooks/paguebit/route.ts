import { NextRequest, NextResponse } from 'next/server';
import { PaguebitService } from '@/lib/services/paguebitService';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    console.log('Paguebit webhook received:', payload);

    // Verificar assinatura do webhook (se implementado pelo Paguebit)
    const signature = request.headers.get('x-paguebit-signature');
    if (signature) {
      const isValid = PaguebitService.verifyWebhookSignature(
        JSON.stringify(payload),
        signature
      );
      if (!isValid) {
        console.error('Invalid webhook signature');
        return NextResponse.json({ received: true }, { status: 200 });
      }
    }

    // Processar o webhook
    await PaguebitService.processWebhook({
      id: payload.id,
      status: payload.status,
      previousStatus: payload.previousStatus,
      amount: payload.amount,
      paidAt: payload.paidAt,
    });

    // Sempre retornar 200 rapidamente
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    console.error('Webhook error:', error);

    // Mesmo em caso de erro, retornar 200 para evitar retries
    return NextResponse.json({ received: true }, { status: 200 });
  }
}

// Endpoint para teste do webhook
export async function GET() {
  return NextResponse.json({
    message: 'Paguebit webhook endpoint',
    instructions: 'Send POST requests with payment status updates',
  });
}
