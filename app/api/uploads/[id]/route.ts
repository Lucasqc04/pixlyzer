export const runtime = 'nodejs';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fail, ok } from '@/lib/apiResponse';

async function getOwnedUpload(userId: string, id: string) {
  const upload = await prisma.upload.findUnique({ where: { id } });
  if (!upload || upload.userId !== userId) throw new Error('NOT_FOUND');
  return upload;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = request.headers.get('x-user-id'); if (!userId) return fail('UNAUTHORIZED', 'Authentication required', 401);
  try {
    const upload = await getOwnedUpload(userId, params.id);
    return ok(upload);
  } catch { return fail('NOT_FOUND', 'Upload não encontrado', 404); }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = request.headers.get('x-user-id'); if (!userId) return fail('UNAUTHORIZED', 'Authentication required', 401);
  try {
    await getOwnedUpload(userId, params.id);
    const updateData = await request.json();
    const allowedFields = ['valor','data','banco','pagador','recebedor','txId','reviewStatus','matchStatus','customerId','linkedSaleId','linkedTransactionId'];
    const fieldsToUpdate: any = {};
    for (const [key, value] of Object.entries(updateData)) {
      if (!allowedFields.includes(key)) continue;
      if (key === 'data' && value) fieldsToUpdate[key] = new Date(value as string);
      else fieldsToUpdate[key] = value || null;
    }
    const updated = await prisma.upload.update({ where: { id: params.id }, data: fieldsToUpdate });
    return ok(updated);
  } catch (e: any) { return fail('UPLOAD_UPDATE_ERROR', e.message || 'Falha ao atualizar upload', 400); }
}

export { PATCH as PUT };

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const userId = request.headers.get('x-user-id'); if (!userId) return fail('UNAUTHORIZED', 'Authentication required', 401);
  try {
    await getOwnedUpload(userId, params.id);
    await prisma.upload.delete({ where: { id: params.id } });
    return ok({ deleted: true });
  } catch { return fail('NOT_FOUND', 'Upload não encontrado', 404); }
}
