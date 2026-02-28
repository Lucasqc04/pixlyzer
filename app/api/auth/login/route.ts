import { NextRequest, NextResponse } from 'next/server';
import { AuthService, loginSchema } from '@/lib/services/authService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar input
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: validation.error.errors },
        { status: 400 }
      );
    }

    // Realizar login
    const { user, token } = await AuthService.login(validation.data);

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
    console.error('Login error:', error);

    return NextResponse.json(
      { error: 'AUTH_ERROR', message: error.message || 'Authentication failed' },
      { status: 401 }
    );
  }
}
