import { NextRequest } from 'next/server';
import { ErpService } from '@/lib/services/erpService';
import { fail, ok } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id'); if (!userId) return fail('UNAUTHORIZED', 'Authentication required', 401);
  const all = await ErpService.listEntities(userId);
  return ok(all.transactions);
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id'); if (!userId) return fail('UNAUTHORIZED', 'Authentication required', 401);
    const data = await ErpService.createTransaction(userId, await request.json());
    return ok(data, 201);
  } catch (error: any) { return fail('ERP_TRANSACTION_ERROR', error.message, 400); }
}
