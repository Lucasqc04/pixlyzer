export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { PaguebitService } from '@/lib/services/paguebitService';
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

    const payments = await PaguebitService.getUserPayments(userId);

    return NextResponse.json({
      success: true,
      data: payments,
    });
  } catch (error: any) {
    logErrorSafe('Get payments error:', error);

    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}
