export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logErrorSafe } from '@/lib/utils/logging';

// PUT - Atualizar detalhes do upload
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const uploadId = params.id;
    
    // Verificar se o upload pertence ao usuário
    const upload = await prisma.upload.findUnique({
      where: { id: uploadId },
    });

    if (!upload || upload.userId !== userId) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Upload not found or unauthorized' },
        { status: 404 }
      );
    }

    // Obter dados para atualizar
    const updateData = await request.json();

    // Validar campos permitidos
    const allowedFields = ['valor', 'data', 'banco', 'pagador', 'recebedor', 'txId'];
    const fieldsToUpdate: any = {};

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        if (key === 'data' && value) {
          // Converter string de data (YYYY-MM-DD) para Date
          const dateObj = new Date(value as string);
          // Validar se é uma data válida
          if (!Number.isNaN(dateObj.getTime())) {
            fieldsToUpdate[key] = dateObj;
          } else {
            fieldsToUpdate[key] = null;
          }
        } else {
          fieldsToUpdate[key] = value || null;
        }
      }
    }

    // Atualizar o upload
    const updatedUpload = await prisma.upload.update({
      where: { id: uploadId },
      data: fieldsToUpdate,
    });

    return NextResponse.json({
      success: true,
      data: updatedUpload,
    });
  } catch (error: any) {
    logErrorSafe('Update upload error:', error);

    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to update upload' },
      { status: 500 }
    );
  }
}

// DELETE - Remover um upload (opcional)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const uploadId = params.id;

    // Verificar se o upload pertence ao usuário
    const upload = await prisma.upload.findUnique({
      where: { id: uploadId },
    });

    if (!upload || upload.userId !== userId) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Upload not found or unauthorized' },
        { status: 404 }
      );
    }

    // Deletar o upload
    await prisma.upload.delete({
      where: { id: uploadId },
    });

    return NextResponse.json({
      success: true,
      message: 'Upload deleted successfully',
    });
  } catch (error: any) {
    logErrorSafe('Delete upload error:', error);

    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to delete upload' },
      { status: 500 }
    );
  }
}
