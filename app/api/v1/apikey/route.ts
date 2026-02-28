
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { ApiKeyService } from '@/lib/services/apiKeyService';

// GET - Listar API keys do usuário
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const apiKeys = await ApiKeyService.getUserApiKeys(userId);

    return NextResponse.json({
      success: true,
      data: apiKeys,
    });
  } catch (error: any) {
    console.error('Get API keys error:', error);

    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to fetch API keys' },
      { status: 500 }
    );
  }
}

// POST - Criar nova API key
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const apiKey = await ApiKeyService.createApiKey(userId);

    return NextResponse.json({
      success: true,
      data: {
        id: apiKey.id,
        key: apiKey.key, // Só mostramos a chave uma vez
        usage: apiKey.usage,
        monthlyLimit: apiKey.monthlyLimit,
        revoked: apiKey.revoked,
        createdAt: apiKey.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Create API key error:', error);

    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to create API key' },
      { status: 500 }
    );
  }
}

// DELETE - Revogar API key
export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const apiKeyId = searchParams.get('id');

    if (!apiKeyId) {
      return NextResponse.json(
        { error: 'ID_REQUIRED', message: 'API key ID is required' },
        { status: 400 }
      );
    }

    await ApiKeyService.revokeApiKey(userId, apiKeyId);

    return NextResponse.json({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error: any) {
    console.error('Revoke API key error:', error);

    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to revoke API key' },
      { status: 500 }
    );
  }
}
