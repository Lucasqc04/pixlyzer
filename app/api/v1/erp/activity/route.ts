import { NextRequest } from 'next/server';
import { fail, ok } from '@/lib/apiResponse';
import { AuditService } from '@/lib/services/auditService';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id'); if (!userId) return fail('UNAUTHORIZED', 'Authentication required', 401);
  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get('entityType');
  const entityId = searchParams.get('entityId');
  if (!entityType || !entityId) return fail('VALIDATION_ERROR', 'entityType e entityId são obrigatórios', 400);
  return ok(await AuditService.timeline(entityType, entityId));
}
