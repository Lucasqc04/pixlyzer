import { NextRequest } from 'next/server';
import { ErpService } from '@/lib/services/erpService';
import { fail, ok } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return fail('UNAUTHORIZED', 'Authentication required', 401);
    return ok(await ErpService.listEntities(userId));
  } catch (error: any) {
    return fail('ERP_LIST_ERROR', error.message, 400);
  }
}
