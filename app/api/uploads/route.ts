export const runtime = 'nodejs';
import { NextRequest } from 'next/server';
import { UploadService } from '@/lib/services/uploadService';
import { UsageService } from '@/lib/services/usageService';
import { ApiKeyService } from '@/lib/services/apiKeyService';
import { fail, ok } from '@/lib/apiResponse';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return fail('UNAUTHORIZED', 'Authentication required', 401);

    const { searchParams } = new URL(request.url);
    const skip = Number.parseInt(searchParams.get('skip') || '0');
    const take = Number.parseInt(searchParams.get('take') || '50');
    const status = searchParams.get('status');
    const banco = searchParams.get('banco');

    if (status || banco) {
      const uploads = await prisma.upload.findMany({ where: { userId, ...(status ? { reviewStatus: status as any } : {}), ...(banco ? { banco: { contains: banco, mode: 'insensitive' } } : {}) }, orderBy: { createdAt: 'desc' }, skip, take });
      const summary = await UploadService.getUploadsSummary(userId);
      return ok({ uploads, summary });
    }

    const uploads = await UploadService.getUserUploads(userId, skip, take);
    const summary = await UploadService.getUploadsSummary(userId);
    return ok({ uploads, summary });
  } catch (error: any) {
    return fail('SERVER_ERROR', error.message || 'Failed to fetch uploads', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) return fail('UNAUTHORIZED', 'Authentication required', 401);

    const limitCheck = await UsageService.checkLimit(userId);
    if (!limitCheck.allowed) return fail('LIMIT_EXCEEDED', 'Monthly limit exceeded. Upgrade to PRO.', 429);

    const formData = await request.formData();
    const files = formData.getAll('file') as File[];
    if (!files || files.length === 0) return fail('FILE_REQUIRED', 'Pelo menos um arquivo é necessário', 400);

    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/jpg']);
    const maxSize = 10 * 1024 * 1024;
    for (const file of files) {
      if (!allowedTypes.has(file.type)) return fail('INVALID_FILE_TYPE', 'Apenas arquivos JPEG e PNG são permitidos', 400);
      if (file.size > maxSize) return fail('FILE_TOO_LARGE', 'O tamanho do arquivo deve ser menor que 10MB', 400);
    }

    const results = await Promise.all(files.map(async (file) => {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      return UploadService.processUpload(userId, buffer, file.name, file.type);
    }));

    try {
      const userApiKeys = await ApiKeyService.getUserApiKeys(userId);
      if (userApiKeys.length > 0 && !userApiKeys[0].revoked) {
        const apiKeys = await prisma.apiKey.findMany({ where: { userId, revoked: false }, orderBy: { createdAt: 'desc' }, take: 1 });
        if (apiKeys.length > 0) await prisma.apiKey.update({ where: { id: apiKeys[0].id }, data: { usage: { increment: files.length } } });
      }
    } catch {}

    return ok(results, 201);
  } catch (error: any) {
    return fail('PROCESSING_ERROR', error.message || 'Failed to process file', 500);
  }
}
