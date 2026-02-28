import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// import { AuthService } from '@/lib/services/authService';
import { jwtVerify } from 'jose';

// Rotas públicas que não precisam de autenticação
const publicRoutes = [
  '/login',
  '/register',
  '/pricing',
  '/docs',
  '/api/auth/login',
  '/api/auth/register',
  '/api/v1/webhooks/paguebit',
];

// Rotas da API pública que usam API Key
const apiPublicRoutes = ['/api/v1/ocr'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Verificar se é uma rota pública
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Verificar se é a API pública (usa API Key)
  // A validação da API Key é feita na rota, não no middleware
  // porque o middleware roda no Edge Runtime que não suporta Prisma
  if (apiPublicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Verificar autenticação para rotas privadas
  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    // Se for uma rota de API, retornar 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Redirecionar para login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    // Verificar token usando jose (Edge Runtime compatível)
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);
      // payload: { userId, email, plan, ... }
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', String((payload as any).userId));
      requestHeaders.set('x-user-plan', String((payload as any).plan));
      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } catch (error) {
      // console.error('Erro ao verificar token no middleware (jose):', error);
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'INVALID_TOKEN', message: 'Invalid or expired token' },
          { status: 401 }
        );
      }
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  } catch (error) {
    // console.error('Erro no middleware:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
