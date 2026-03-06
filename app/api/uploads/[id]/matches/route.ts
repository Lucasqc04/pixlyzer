import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fail, ok } from '@/lib/apiResponse';
import { ReconciliationService } from '@/lib/services/reconciliationService';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = request.headers.get('x-user-id'); if (!userId) return fail('UNAUTHORIZED', 'Authentication required', 401);
  const upload = await prisma.upload.findUnique({ where: { id: params.id } });
  if (!upload || upload.userId !== userId) return fail('NOT_FOUND', 'Upload não encontrado', 404);
  const matches = await ReconciliationService.matchUploadToSales(params.id);
  return ok(matches);
}
