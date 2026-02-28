import { NextRequest, NextResponse } from 'next/server';
import { PaguebitService } from '@/lib/services/paguebitService';

export async function GET(request: NextRequest) {
  const paymentId = request.nextUrl.searchParams.get('id');
  if (!paymentId) {
    return NextResponse.json({ error: 'MISSING_ID', message: 'ID do pagamento é obrigatório' }, { status: 400 });
  }
  try {
    const payment = await PaguebitService.getPayment(paymentId);
    return NextResponse.json({ success: true, data: payment });
  } catch (error: any) {
    return NextResponse.json({ error: 'NOT_FOUND', message: error.message }, { status: 404 });
  }
}
