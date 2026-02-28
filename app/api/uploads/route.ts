
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { UploadService } from '@/lib/services/uploadService';
import { UsageService } from '@/lib/services/usageService';
import { ApiKeyService } from '@/lib/services/apiKeyService';

// GET - Listar uploads do usuário
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const skip = Number.parseInt(searchParams.get('skip') || '0');
    const take = Number.parseInt(searchParams.get('take') || '50');

    const uploads = await UploadService.getUserUploads(userId, skip, take);
    const summary = await UploadService.getUploadsSummary(userId);

    return NextResponse.json({
      success: true,
      data: {
        uploads,
        summary,
      },
    });
  } catch (error: any) {
    console.error('Get uploads error:', error);

    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to fetch uploads' },
      { status: 500 }
    );
  }
}

// POST - Processar novo upload
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verificar limite
    const limitCheck = await UsageService.checkLimit(userId);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: 'LIMIT_EXCEEDED', message: 'Monthly limit exceeded. Upgrade to PRO.' },
        { status: 429 }
      );
    }


    // Processar multipart form data
    const formData = await request.formData();
    // Suporte a múltiplos arquivos
    const files = formData.getAll('file') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'FILE_REQUIRED', message: 'Pelo menos um arquivo é necessário' },
        { status: 400 }
      );
    }

    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/jpg']);
    const maxSize = 10 * 1024 * 1024;

    // Validar todos os arquivos
    for (const file of files) {
      if (!allowedTypes.has(file.type)) {
        return NextResponse.json(
          { error: 'INVALID_FILE_TYPE', message: 'Apenas arquivos JPEG e PNG são permitidos' },
          { status: 400 }
        );
      }
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: 'FILE_TOO_LARGE', message: 'O tamanho do arquivo deve ser menor que 10MB' },
          { status: 400 }
        );
      }
    }

    // Processar todos os uploads em paralelo
    const results = await Promise.all(
      files.map(async (file) => {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        return UploadService.processUpload(
          userId,
          buffer,
          file.name,
          file.type
        );
      })
    );

    // Incrementar uso (1 por arquivo)
    try {
      const userApiKeys = await ApiKeyService.getUserApiKeys(userId);
      if (userApiKeys.length > 0 && !userApiKeys[0].revoked) {
        const { prisma } = await import('@/lib/prisma');
        const apiKeys = await prisma.apiKey.findMany({
          where: { userId, revoked: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
        });
        if (apiKeys.length > 0) {
          await prisma.apiKey.update({
            where: { id: apiKeys[0].id },
            data: { usage: { increment: files.length } },
          });
        }
      }
    } catch (e) {
      // erro ao incrementar uso, mas não bloqueia o upload
      console.error('Erro ao incrementar uso da API key:', e);
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error('Upload error:', error);

    return NextResponse.json(
      { error: 'PROCESSING_ERROR', message: error.message || 'Failed to process file' },
      { status: 500 }
    );
  }
}
