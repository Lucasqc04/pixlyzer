import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { generateApiKey } from '@/lib/utils';

export interface ApiKeyData {
  id: string;
  key: string;
  usage: number;
  monthlyLimit: number;
  revoked: boolean;
  createdAt: Date;
  lastUsedAt?: Date;
}

export class ApiKeyService {
  static async createApiKey(userId: string): Promise<ApiKeyData> {
    const apiKey = generateApiKey();
    const keyHash = await bcrypt.hash(apiKey, 12);

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    const monthlyLimit = user?.plan === 'PRO' ? 500 : 10;

    const dbApiKey = await prisma.apiKey.create({
      data: {
        keyHash,
        userId,
        monthlyLimit,
      },
    });

    return {
      id: dbApiKey.id,
      key: apiKey,
      usage: dbApiKey.usage,
      monthlyLimit: dbApiKey.monthlyLimit,
      revoked: dbApiKey.revoked,
      createdAt: dbApiKey.createdAt,
      lastUsedAt: dbApiKey.lastUsedAt || undefined,
    };
  }

  static async validateApiKey(apiKey: string): Promise<{ valid: boolean; userId?: string; error?: string }> {
    if (!apiKey.startsWith('sk_live_')) {
      return { valid: false, error: 'INVALID_KEY_FORMAT' };
    }

    // Buscar todas as chaves não revogadas
    const apiKeys = await prisma.apiKey.findMany({
      where: {
        revoked: false,
      },
    });

    for (const key of apiKeys) {
      const isMatch = await bcrypt.compare(apiKey, key.keyHash);
      if (isMatch) {
        // Verificar limite
        if (key.usage >= key.monthlyLimit) {
          return { valid: false, error: 'LIMIT_EXCEEDED' };
        }

        // Atualizar último uso
        await prisma.apiKey.update({
          where: { id: key.id },
          data: { lastUsedAt: new Date() },
        });

        return { valid: true, userId: key.userId };
      }
    }

    return { valid: false, error: 'INVALID_KEY' };
  }

  static async incrementUsage(apiKey: string): Promise<void> {
    const apiKeys = await prisma.apiKey.findMany({
      where: {
        revoked: false,
      },
    });

    for (const key of apiKeys) {
      const isMatch = await bcrypt.compare(apiKey, key.keyHash);
      if (isMatch) {
        await prisma.apiKey.update({
          where: { id: key.id },
          data: { usage: { increment: 1 } },
        });
        return;
      }
    }
  }

  static async getUserApiKeys(userId: string): Promise<Omit<ApiKeyData, 'key'>[]> {
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return apiKeys.map((key) => ({
      id: key.id,
      usage: key.usage,
      monthlyLimit: key.monthlyLimit,
      revoked: key.revoked,
      createdAt: key.createdAt,
      lastUsedAt: key.lastUsedAt || undefined,
    }));
  }

  static async revokeApiKey(userId: string, apiKeyId: string): Promise<void> {
    const apiKey = await prisma.apiKey.findFirst({
      where: { id: apiKeyId, userId },
    });

    if (!apiKey) {
      throw new Error('API Key não encontrada');
    }

    await prisma.apiKey.update({
      where: { id: apiKeyId },
      data: { revoked: true },
    });
  }

  static async resetMonthlyUsage(): Promise<void> {
    // Resetar uso mensal (pode ser chamado por cron job)
    await prisma.apiKey.updateMany({
      data: { usage: 0 },
    });
  }

  static async updatePlanLimits(userId: string, plan: 'FREE' | 'PRO'): Promise<void> {
    const monthlyLimit = plan === 'PRO' ? 500 : 10;

    await prisma.apiKey.updateMany({
      where: { userId },
      data: { monthlyLimit },
    });
  }
}
