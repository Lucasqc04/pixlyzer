import { NextRequest, NextResponse } from 'next/server';
import { ErpService } from '@/lib/services/erpService';

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    const body = await request.json();
    const data = await ErpService.createProduct(userId, body);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: 'ERP_PRODUCT_ERROR', message: error.message }, { status: 400 });
  }
}
