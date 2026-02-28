import { prisma } from '@/lib/prisma';

export interface UsageStats {
  totalUploads: number;
  totalValor: number;
  currentMonthUploads: number;
  currentMonthValor: number;
  plan: string;
  monthlyLimit: number;
  currentUsage: number;
  remaining: number;
}

export class UsageService {
  static async getUserStats(userId: string): Promise<UsageStats> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        uploads: true,
        apiKeys: {
          where: { revoked: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Calcular estatísticas
    const totalUploads = user.uploads.length;
    const totalValor = user.uploads.reduce((sum, upload) => sum + (upload.valor || 0), 0);

    const currentMonthUploads = user.uploads.filter(
      (upload) => upload.createdAt >= firstDayOfMonth
    ).length;

    const currentMonthValor = user.uploads
      .filter((upload) => upload.createdAt >= firstDayOfMonth)
      .reduce((sum, upload) => sum + (upload.valor || 0), 0);

    const apiKey = user.apiKeys[0];
    const monthlyLimit = apiKey?.monthlyLimit || (user.plan === 'PRO' ? 500 : 10);
    const currentUsage = apiKey?.usage || 0;

    return {
      totalUploads,
      totalValor,
      currentMonthUploads,
      currentMonthValor,
      plan: user.plan,
      monthlyLimit,
      currentUsage,
      remaining: Math.max(0, monthlyLimit - currentUsage),
    };
  }

  static async checkLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        apiKeys: {
          where: { revoked: false },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const apiKey = user.apiKeys[0];
    const monthlyLimit = apiKey?.monthlyLimit || (user.plan === 'PRO' ? 500 : 10);
    const currentUsage = apiKey?.usage || 0;
    const remaining = Math.max(0, monthlyLimit - currentUsage);

    return {
      allowed: remaining > 0,
      remaining,
    };
  }

  static async getRecentUploads(userId: string, limit: number = 10) {
    return prisma.upload.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
