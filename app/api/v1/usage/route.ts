export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { UsageService } from '@/lib/services/usageService';
import { logErrorSafe } from '@/lib/utils/logging';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required' },
        { status: 401 }
      );
    }

    const stats = await UsageService.getUserStats(userId);
    const recentUploads = await UsageService.getRecentUploads(userId, 10);

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalUploads: stats.totalUploads,
          totalValor: stats.totalValor,
          currentMonthUploads: stats.currentMonthUploads,
          currentMonthValor: stats.currentMonthValor,
          plan: stats.plan,
          monthlyLimit: stats.monthlyLimit,
          currentUsage: stats.currentUsage,
          remaining: stats.remaining,
        },
        recentUploads,
      },
    });
  } catch (error: any) {
    logErrorSafe('Get usage error:', error);

    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to fetch usage data' },
      { status: 500 }
    );
  }
}
