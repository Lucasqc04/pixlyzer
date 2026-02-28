import { NextRequest, NextResponse } from 'next/server';
import { AuthService, registerSchema } from '@/lib/services/authService';
import { ApiKeyService } from '@/lib/services/apiKeyService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar input
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Criar usuário
    const { user, token } = await AuthService.register(validation.data);

    // Criar API key inicial
    await ApiKeyService.createApiKey(user.id);

    // Criar resposta com cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
      },
    });

    // Definir cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 dias
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Register error:', error);

    return NextResponse.json(
      { error: 'REGISTER_ERROR', message: error.message || 'Registration failed' },
      { status: 400 }
    );
  }
}
