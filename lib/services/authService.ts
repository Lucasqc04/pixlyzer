import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { EmailService } from './emailService';

const JWT_SECRET = process.env.JWT_SECRET!;

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

export const registerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export interface AuthUser {
  id: string;
  email: string;
  plan: string;
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateToken(user: AuthUser): string {
    return jwt.sign(
      { userId: user.id, email: user.email, plan: user.plan },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  static verifyToken(token: string): AuthUser {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return {
      id: decoded.userId,
      email: decoded.email,
      plan: decoded.plan,
    };
  }

  static async register(data: RegisterInput): Promise<{ user: AuthUser; token: string }> {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('Email já cadastrado');
    }

    const passwordHash = await this.hashPassword(data.password);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
      },
    });

    await prisma.store.create({
      data: {
        name: `Loja de ${data.email.split('@')[0]}`,
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'OWNER',
            permissions: ['*'],
          },
        },
      },
    });

    const verificationToken = EmailService.generateToken();
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });
    await EmailService.sendVerificationEmail(user.email, verificationToken);

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      plan: user.plan,
    };

    const token = this.generateToken(authUser);

    return { user: authUser, token };
  }

  static async login(data: LoginInput): Promise<{ user: AuthUser; token: string }> {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new Error('Credenciais inválidas');
    }

    const isValidPassword = await this.comparePassword(data.password, user.passwordHash);

    if (!isValidPassword) {
      throw new Error('Credenciais inválidas');
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      plan: user.plan,
    };

    const token = this.generateToken(authUser);

    return { user: authUser, token };
  }

  static async getUserById(userId: string): Promise<AuthUser | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      plan: user.plan,
    };
  }
}
