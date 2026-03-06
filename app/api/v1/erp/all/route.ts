import { NextRequest, NextResponse } from 'next/server';
import { ErpService } from '@/lib/services/erpService';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    const data = await ErpService.listEntities(userId);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: 'ERP_LIST_ERROR', message: error.message }, { status: 400 });
  }
}
