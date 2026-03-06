import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fail, ok } from '@/lib/apiResponse';
import { ReconciliationService } from '@/lib/services/reconciliationService';
import { AuditService } from '@/lib/services/auditService';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = request.headers.get('x-user-id'); if (!userId) return fail('UNAUTHORIZED', 'Authentication required', 401);
  const upload = await prisma.upload.findUnique({ where: { id: params.id } });
  if (!upload || upload.userId !== userId) return fail('NOT_FOUND', 'Upload não encontrado', 404);
  const body = await request.json();
  if (!body.saleId) return fail('VALIDATION_ERROR', 'saleId é obrigatório', 400);
  const result = await ReconciliationService.confirmMatch(params.id, body.saleId);
  await AuditService.log({ userId, entityType: 'UPLOAD', entityId: params.id, action: 'CONFIRM_MATCH', changes: body });
  return ok(result);
}
