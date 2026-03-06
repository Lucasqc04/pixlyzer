import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { EmailService } from './emailService';

export const productSchema = z.object({
  name: z.string().min(2),
  sku: z.string().optional(),
  price: z.number().nonnegative(),
  cost: z.number().nonnegative().optional(),
  stock: z.number().int().nonnegative().default(0),
});

export const customerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  document: z.string().optional(),
  notes: z.string().optional(),
});

export const sellerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
});

export const saleSchema = z.object({
  customerId: z.string().uuid().optional(),
  sellerId: z.string().uuid().optional(),
  notes: z.string().optional(),
  discount: z.number().nonnegative().default(0),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive(),
    unitPrice: z.number().nonnegative().optional(),
  })).min(1),
});

export const transactionSchema = z.object({
  kind: z.enum(['INCOME', 'EXPENSE']),
  description: z.string().min(2),
  amount: z.number().positive(),
  paidAt: z.string().datetime().optional(),
  reference: z.string().optional(),
});

export const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['OWNER', 'MANAGER', 'SELLER', 'FINANCE', 'VIEWER']).default('VIEWER'),
  permissions: z.array(z.string()).default([]),
});

export class ErpService {
  static async getPrimaryStore(userId: string) {
    let membership = await prisma.storeMember.findFirst({
      where: { userId },
      include: { store: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!membership) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('Usuário não encontrado');
      const store = await prisma.store.create({
        data: {
          name: `Loja de ${user.email.split('@')[0]}`,
          ownerId: user.id,
          members: { create: { userId, role: 'OWNER', permissions: ['*'] } },
        },
      });
      membership = await prisma.storeMember.findFirst({ where: { storeId: store.id, userId }, include: { store: true } });
    }

    return membership!;
  }

  static async dashboard(userId: string) {
    const membership = await this.getPrimaryStore(userId);
    const storeId = membership.storeId;

    const [productCount, customerCount, sellerCount, sales, transactions, topProducts, monthlySales] = await Promise.all([
      prisma.product.count({ where: { storeId } }),
      prisma.customer.count({ where: { storeId } }),
      prisma.seller.count({ where: { storeId } }),
      prisma.sale.findMany({ where: { storeId }, include: { items: true }, orderBy: { saleDate: 'desc' }, take: 10 }),
      prisma.transaction.findMany({ where: { storeId }, orderBy: { paidAt: 'desc' }, take: 10 }),
      prisma.saleItem.groupBy({ by: ['productId'], _sum: { quantity: true, subtotal: true }, orderBy: { _sum: { subtotal: 'desc' } }, where: { sale: { storeId } }, take: 5 }),
      prisma.$queryRaw<Array<{ month: string; total: number }>>`
        SELECT to_char(date_trunc('month', "saleDate"), 'YYYY-MM') AS month,
               COALESCE(SUM(total - discount),0)::float AS total
        FROM "Sale"
        WHERE "storeId" = ${storeId}
        GROUP BY 1
        ORDER BY 1 DESC
        LIMIT 12
      `,
    ]);

    const topProductIds = topProducts.map((p) => p.productId);
    const products = await prisma.product.findMany({ where: { id: { in: topProductIds } } });
    const topProductsFormatted = topProducts.map((tp) => ({
      productId: tp.productId,
      productName: products.find((p) => p.id === tp.productId)?.name || 'Produto',
      quantity: tp._sum.quantity || 0,
      revenue: tp._sum.subtotal || 0,
    }));

    const income = transactions.filter((t) => t.kind === 'INCOME').reduce((a, b) => a + b.amount, 0);
    const expenses = transactions.filter((t) => t.kind === 'EXPENSE').reduce((a, b) => a + b.amount, 0);

    return {
      store: membership.store,
      metrics: {
        productCount,
        customerCount,
        sellerCount,
        netCashflow: income - expenses,
        salesVolume: sales.reduce((acc, s) => acc + (s.total - s.discount), 0),
      },
      recentSales: sales,
      recentTransactions: transactions,
      topProducts: topProductsFormatted,
      monthlySales: monthlySales.reverse(),
    };
  }

  static async createProduct(userId: string, payload: unknown) {
    const membership = await this.getPrimaryStore(userId);
    const data = productSchema.parse(payload);
    return prisma.product.create({ data: { ...data, storeId: membership.storeId } });
  }

  static async createCustomer(userId: string, payload: unknown) {
    const membership = await this.getPrimaryStore(userId);
    const data = customerSchema.parse(payload);
    return prisma.customer.create({ data: { ...data, email: data.email || null, storeId: membership.storeId } });
  }

  static async createSeller(userId: string, payload: unknown) {
    const membership = await this.getPrimaryStore(userId);
    const data = sellerSchema.parse(payload);
    return prisma.seller.create({ data: { ...data, email: data.email || null, storeId: membership.storeId } });
  }

  static async createSale(userId: string, payload: unknown) {
    const membership = await this.getPrimaryStore(userId);
    const data = saleSchema.parse(payload);

    const products = await prisma.product.findMany({ where: { id: { in: data.items.map((i) => i.productId) }, storeId: membership.storeId } });
    if (products.length !== data.items.length) throw new Error('Produto inválido na venda');

    const items = data.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      const unitPrice = item.unitPrice ?? product.price;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        subtotal: unitPrice * item.quantity,
      };
    });

    const total = items.reduce((acc, item) => acc + item.subtotal, 0);

    const sale = await prisma.sale.create({
      data: {
        storeId: membership.storeId,
        customerId: data.customerId,
        sellerId: data.sellerId,
        notes: data.notes,
        discount: data.discount,
        total,
        items: { create: items },
      },
      include: { items: true },
    });

    await Promise.all(items.map((item) => prisma.product.update({
      where: { id: item.productId },
      data: { stock: { decrement: item.quantity } },
    })));

    await prisma.transaction.create({
      data: {
        storeId: membership.storeId,
        saleId: sale.id,
        kind: 'INCOME',
        source: 'MANUAL',
        description: `Venda ${sale.id.slice(0, 8)}`,
        amount: total - data.discount,
      },
    });

    return sale;
  }

  static async createTransaction(userId: string, payload: unknown) {
    const membership = await this.getPrimaryStore(userId);
    const data = transactionSchema.parse(payload);
    return prisma.transaction.create({
      data: {
        storeId: membership.storeId,
        kind: data.kind,
        description: data.description,
        amount: data.amount,
        reference: data.reference,
        paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
      },
    });
  }

  static async listEntities(userId: string) {
    const membership = await this.getPrimaryStore(userId);
    const storeId = membership.storeId;
    const [products, customers, sellers, sales, transactions, team, invitations] = await Promise.all([
      prisma.product.findMany({ where: { storeId }, orderBy: { createdAt: 'desc' } }),
      prisma.customer.findMany({ where: { storeId }, orderBy: { createdAt: 'desc' } }),
      prisma.seller.findMany({ where: { storeId }, orderBy: { createdAt: 'desc' } }),
      prisma.sale.findMany({ where: { storeId }, include: { customer: true, seller: true, items: { include: { product: true } } }, orderBy: { saleDate: 'desc' } }),
      prisma.transaction.findMany({ where: { storeId }, orderBy: { paidAt: 'desc' } }),
      prisma.storeMember.findMany({ where: { storeId }, include: { user: true } }),
      prisma.storeInvitation.findMany({ where: { storeId, acceptedAt: null }, orderBy: { createdAt: 'desc' } }),
    ]);

    return { store: membership.store, products, customers, sellers, sales, transactions, team, invitations };
  }

  static async inviteUser(userId: string, payload: unknown) {
    const membership = await this.getPrimaryStore(userId);
    const data = inviteSchema.parse(payload);
    const token = EmailService.generateToken();

    const invitation = await prisma.storeInvitation.create({
      data: {
        storeId: membership.storeId,
        email: data.email,
        role: data.role,
        permissions: data.permissions,
        token,
        invitedById: userId,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      },
    });

    await EmailService.sendInvitationEmail(data.email, token, membership.store.name);

    return invitation;
  }

  static async acceptInvite(userId: string, token: string) {
    const invitation = await prisma.storeInvitation.findUnique({ where: { token } });
    if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
      throw new Error('Convite inválido ou expirado');
    }

    await prisma.storeMember.upsert({
      where: { storeId_userId: { storeId: invitation.storeId, userId } },
      update: { role: invitation.role, permissions: invitation.permissions },
      create: {
        storeId: invitation.storeId,
        userId,
        role: invitation.role,
        permissions: invitation.permissions,
      },
    });

    return prisma.storeInvitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
  }
}
