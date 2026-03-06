import { prisma } from '@/lib/prisma';

export class AuditService {
  static async log(input: { userId: string; storeId?: string; entityType: string; entityId: string; action: string; changes?: any }) {
    return prisma.auditLog.create({ data: { userId: input.userId, storeId: input.storeId, entityType: input.entityType, entityId: input.entityId, action: input.action, changes: input.changes } });
  }

  static async timeline(entityType: string, entityId: string) {
    return prisma.auditLog.findMany({ where: { entityType, entityId }, orderBy: { createdAt: 'desc' }, take: 100 });
  }
}
