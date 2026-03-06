import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { EmailService } from './emailService';
import { AuditService } from './auditService';

export const productSchema = z.object({ name: z.string().min(2), sku: z.string().optional(), price: z.number().nonnegative(), cost: z.number().nonnegative().optional(), stock: z.number().int().nonnegative().default(0), minStock: z.number().int().nonnegative().default(0), category: z.string().optional(), unit: z.string().optional(), description: z.string().optional(), internalNotes: z.string().optional(), active: z.boolean().optional() });
export const customerSchema = z.object({ name: z.string().min(2), email: z.string().email().optional().or(z.literal('')), phone: z.string().optional(), document: z.string().optional(), documentType: z.string().optional(), cep: z.string().optional(), street: z.string().optional(), streetNumber: z.string().optional(), complement: z.string().optional(), district: z.string().optional(), city: z.string().optional(), state: z.string().optional(), tags: z.array(z.string()).optional(), notes: z.string().optional(), active: z.boolean().optional() });
export const sellerSchema = z.object({ name: z.string().min(2), email: z.string().email().optional().or(z.literal('')), phone: z.string().optional(), commissionRate: z.number().nonnegative().optional(), notes: z.string().optional(), active: z.boolean().optional() });
export const saleSchema = z.object({ customerId: z.string().uuid().optional(), sellerId: z.string().uuid().optional(), notes: z.string().optional(), discount: z.number().nonnegative().default(0), freight: z.number().nonnegative().default(0), paymentMethod: z.string().optional(), status: z.string().optional(), source: z.enum(['MANUAL','OCR_PIX']).optional(), items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().positive(), unitPrice: z.number().nonnegative().optional() })).min(1) });
export const transactionSchema = z.object({ kind: z.enum(['INCOME', 'EXPENSE']), description: z.string().min(2), amount: z.number().positive(), category: z.string().optional(), status: z.string().optional(), notes: z.string().optional(), paidAt: z.string().datetime().optional(), reference: z.string().optional() });
export const inviteSchema = z.object({ email: z.string().email(), role: z.enum(['OWNER', 'MANAGER', 'SELLER', 'FINANCE', 'VIEWER']).default('VIEWER'), permissions: z.array(z.string()).default([]) });

export class ErpService {
  static async getPrimaryStore(userId: string) {
    let membership = await prisma.storeMember.findFirst({ where: { userId }, include: { store: true }, orderBy: { createdAt: 'asc' } });
    if (!membership) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('Usuário não encontrado');
      const store = await prisma.store.create({ data: { name: `Loja de ${user.email.split('@')[0]}`, ownerId: user.id, members: { create: { userId, role: 'OWNER', permissions: ['*'] } } } });
      membership = await prisma.storeMember.findFirst({ where: { storeId: store.id, userId }, include: { store: true } });
    }
    return membership!;
  }

  static async requirePermission(userId: string, needed: string) {
    const m = await this.getPrimaryStore(userId);
    if (!(m.role === 'OWNER' || m.permissions.includes('*') || m.permissions.includes(needed))) throw new Error(`FORBIDDEN:${needed}`);
    return m;
  }

  static async dashboard(userId: string) {
    const m = await this.getPrimaryStore(userId); const storeId = m.storeId;
    const [products, customers, sellers, sales, transactions, uploads] = await Promise.all([
      prisma.product.findMany({ where: { storeId } }),
      prisma.customer.findMany({ where: { storeId } }),
      prisma.seller.findMany({ where: { storeId } }),
      prisma.sale.findMany({ where: { storeId }, include: { customer: true, seller: true, items: true }, orderBy: { saleDate: 'desc' }, take: 50 }),
      prisma.transaction.findMany({ where: { storeId }, orderBy: { paidAt: 'desc' }, take: 50 }),
      prisma.upload.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }),
    ]);
    const income = transactions.filter((t) => t.kind === 'INCOME').reduce((a, b) => a + b.amount, 0);
    const expenses = transactions.filter((t) => t.kind === 'EXPENSE').reduce((a, b) => a + b.amount, 0);
    const lowStock = products.filter((p) => p.stock <= (p.minStock || 0));
    const topCustomers = customers.map(c => ({...c, total: sales.filter(s=>s.customerId===c.id).reduce((a,b)=>a+(b.total-b.discount+b.freight),0)})).sort((a,b)=>b.total-a.total).slice(0,5);
    const topSellers = sellers.map(s => ({...s, total: sales.filter(v=>v.sellerId===s.id).reduce((a,b)=>a+(b.total-b.discount+b.freight),0)})).sort((a,b)=>b.total-a.total).slice(0,5);
    const reviewed = uploads.filter(u => u.reviewStatus === 'REVIEWED').length;
    const pendingUploads = uploads.filter(u => u.reviewStatus === 'PENDING').length;
    const reconciledUploads = uploads.filter(u => u.matchStatus === 'CONFIRMED').length;
    return { store: m.store, metrics: { productCount: products.length, customerCount: customers.length, sellerCount: sellers.length, netCashflow: income-expenses, salesVolume: sales.reduce((a,s)=>a+(s.total-s.discount+s.freight),0), ocrCount: uploads.length, reviewRate: uploads.length ? reviewed/uploads.length : 0, pendingUploads, reconciledUploads }, topProducts: products.slice(0,5), topCustomers, topSellers, lowStock, recentSales: sales.slice(0,10), recentTransactions: transactions.slice(0,10), recentUploads: uploads.slice(0,10), bySource: Object.entries(transactions.reduce((a:any,t)=>{a[t.source]=(a[t.source]||0)+1;return a;},{})).map(([source,count])=>({source,count})) };
  }

  static async createProduct(userId: string, payload: unknown) { const m = await this.requirePermission(userId, 'can_manage_products'); const data = productSchema.parse(payload); const item = await prisma.product.create({ data: { ...data, storeId: m.storeId } }); await AuditService.log({ userId, storeId: m.storeId, entityType: 'PRODUCT', entityId: item.id, action: 'CREATE', changes: data }); return item; }
  static async updateProduct(userId: string, id: string, payload: unknown) { const m = await this.requirePermission(userId, 'can_manage_products'); const data = productSchema.partial().parse(payload); const item = await prisma.product.findFirstOrThrow({ where: { id, storeId: m.storeId } }); const updated = await prisma.product.update({ where: { id: item.id }, data }); await AuditService.log({ userId, storeId: m.storeId, entityType: 'PRODUCT', entityId: id, action: 'UPDATE', changes: data }); return updated; }
  static async archiveProduct(userId: string, id: string) { const m = await this.requirePermission(userId, 'can_manage_products'); const item = await prisma.product.findFirstOrThrow({ where: { id, storeId: m.storeId } }); const updated = await prisma.product.update({ where: { id: item.id }, data: { active: false } }); await AuditService.log({ userId, storeId: m.storeId, entityType: 'PRODUCT', entityId: id, action: 'ARCHIVE' }); return updated; }

  static async createCustomer(userId: string, payload: unknown) { const m = await this.requirePermission(userId, 'can_manage_customers'); const data = customerSchema.parse(payload); const item = await prisma.customer.create({ data: { ...data, email: data.email || null, storeId: m.storeId } }); await AuditService.log({ userId, storeId: m.storeId, entityType: 'CUSTOMER', entityId: item.id, action: 'CREATE', changes: data }); return item; }
  static async updateCustomer(userId: string, id: string, payload: unknown) { const m = await this.requirePermission(userId, 'can_manage_customers'); const data = customerSchema.partial().parse(payload); const item = await prisma.customer.findFirstOrThrow({ where: { id, storeId: m.storeId } }); const updated = await prisma.customer.update({ where: { id: item.id }, data: { ...data, email: data.email || undefined } }); await AuditService.log({ userId, storeId: m.storeId, entityType: 'CUSTOMER', entityId: id, action: 'UPDATE', changes: data }); return updated; }
  static async archiveCustomer(userId: string, id: string) { const m = await this.requirePermission(userId, 'can_manage_customers'); const item = await prisma.customer.findFirstOrThrow({ where: { id, storeId: m.storeId } }); const updated = await prisma.customer.update({ where: { id: item.id }, data: { active: false } }); await AuditService.log({ userId, storeId: m.storeId, entityType: 'CUSTOMER', entityId: id, action: 'ARCHIVE' }); return updated; }

  static async createSeller(userId: string, payload: unknown) { const m = await this.requirePermission(userId, 'can_manage_sellers'); const data = sellerSchema.parse(payload); const item = await prisma.seller.create({ data: { ...data, email: data.email || null, storeId: m.storeId } }); await AuditService.log({ userId, storeId: m.storeId, entityType: 'SELLER', entityId: item.id, action: 'CREATE', changes: data }); return item; }
  static async updateSeller(userId: string, id: string, payload: unknown) { const m = await this.requirePermission(userId, 'can_manage_sellers'); const data = sellerSchema.partial().parse(payload); const item = await prisma.seller.findFirstOrThrow({ where: { id, storeId: m.storeId } }); const updated = await prisma.seller.update({ where: { id: item.id }, data: { ...data, email: data.email || undefined } }); await AuditService.log({ userId, storeId: m.storeId, entityType: 'SELLER', entityId: id, action: 'UPDATE', changes: data }); return updated; }
  static async archiveSeller(userId: string, id: string) { const m = await this.requirePermission(userId, 'can_manage_sellers'); const item = await prisma.seller.findFirstOrThrow({ where: { id, storeId: m.storeId } }); const updated = await prisma.seller.update({ where: { id: item.id }, data: { active: false } }); await AuditService.log({ userId, storeId: m.storeId, entityType: 'SELLER', entityId: id, action: 'ARCHIVE' }); return updated; }

  static async createSale(userId: string, payload: unknown) {
    const m = await this.requirePermission(userId, 'can_create_sales'); const data = saleSchema.parse(payload);
    const products = await prisma.product.findMany({ where: { id: { in: data.items.map((i) => i.productId) }, storeId: m.storeId } });
    if (products.length !== data.items.length) throw new Error('Produto inválido na venda');
    const items = data.items.map((item) => { const p = products.find((x) => x.id === item.productId)!; const unitPrice = item.unitPrice ?? p.price; return { productId: item.productId, quantity: item.quantity, unitPrice, subtotal: unitPrice * item.quantity }; });
    const gross = items.reduce((a, i) => a + i.subtotal, 0);
    const sale = await prisma.sale.create({ data: { storeId: m.storeId, customerId: data.customerId, sellerId: data.sellerId, notes: data.notes, discount: data.discount, freight: data.freight, paymentMethod: data.paymentMethod, status: data.status || 'CONFIRMED', source: data.source || 'MANUAL', total: gross, items: { create: items } }, include: { items: true } });
    await Promise.all(items.map((item) => prisma.product.update({ where: { id: item.productId }, data: { stock: { decrement: item.quantity } } })));
    await prisma.stockMovement.createMany({ data: items.map((i) => ({ productId: i.productId, storeId: m.storeId, type: 'SALE', quantity: -i.quantity, reference: sale.id })) });
    await prisma.transaction.create({ data: { storeId: m.storeId, saleId: sale.id, kind: 'INCOME', source: data.source || 'MANUAL', description: `Venda ${sale.id.slice(0, 8)}`, amount: gross - data.discount + data.freight, category: 'SALES', status: 'CONFIRMED' } });
    await AuditService.log({ userId, storeId: m.storeId, entityType: 'SALE', entityId: sale.id, action: 'CREATE', changes: { total: gross } });
    return sale;
  }
  static async updateSale(userId: string, id: string, payload: unknown) { const m = await this.requirePermission(userId, 'can_edit_sales'); const data = saleSchema.partial().omit({items:true}).parse(payload); const item = await prisma.sale.findFirstOrThrow({ where: { id, storeId: m.storeId } }); const updated = await prisma.sale.update({ where: { id: item.id }, data }); await AuditService.log({ userId, storeId: m.storeId, entityType: 'SALE', entityId: id, action: 'UPDATE', changes: data }); return updated; }
  static async archiveSale(userId: string, id: string) { const m = await this.requirePermission(userId, 'can_edit_sales'); const item = await prisma.sale.findFirstOrThrow({ where: { id, storeId: m.storeId } }); const updated = await prisma.sale.update({ where: { id: item.id }, data: { status: 'CANCELLED' } }); await AuditService.log({ userId, storeId: m.storeId, entityType: 'SALE', entityId: id, action: 'CANCEL' }); return updated; }

  static async createTransaction(userId: string, payload: unknown) { const m = await this.requirePermission(userId, 'can_view_finance'); const data = transactionSchema.parse(payload); const tx = await prisma.transaction.create({ data: { storeId: m.storeId, kind: data.kind, description: data.description, amount: data.amount, reference: data.reference, category: data.category, status: data.status || 'CONFIRMED', notes: data.notes, paidAt: data.paidAt ? new Date(data.paidAt) : new Date() } }); await AuditService.log({ userId, storeId: m.storeId, entityType: 'TRANSACTION', entityId: tx.id, action: 'CREATE', changes: data }); return tx; }
  static async updateTransaction(userId: string, id: string, payload: unknown) { const m = await this.requirePermission(userId, 'can_view_finance'); const data = transactionSchema.partial().parse(payload); const item = await prisma.transaction.findFirstOrThrow({ where: { id, storeId: m.storeId } }); const tx = await prisma.transaction.update({ where: { id: item.id }, data: { ...data, paidAt: data.paidAt ? new Date(data.paidAt) : undefined } }); await AuditService.log({ userId, storeId: m.storeId, entityType: 'TRANSACTION', entityId: id, action: 'UPDATE', changes: data }); return tx; }

  static async listEntities(userId: string) {
    const m = await this.getPrimaryStore(userId); const storeId = m.storeId;
    const [products, customers, sellers, sales, transactions, team, invitations] = await Promise.all([
      prisma.product.findMany({ where: { storeId }, orderBy: { createdAt: 'desc' } }),
      prisma.customer.findMany({ where: { storeId }, orderBy: { createdAt: 'desc' } }),
      prisma.seller.findMany({ where: { storeId }, orderBy: { createdAt: 'desc' } }),
      prisma.sale.findMany({ where: { storeId }, include: { customer: true, seller: true, items: { include: { product: true } } }, orderBy: { saleDate: 'desc' } }),
      prisma.transaction.findMany({ where: { storeId }, orderBy: { paidAt: 'desc' } }),
      prisma.storeMember.findMany({ where: { storeId }, include: { user: true } }),
      prisma.storeInvitation.findMany({ where: { storeId, acceptedAt: null }, orderBy: { createdAt: 'desc' } }),
    ]);
    return { store: m.store, products, customers, sellers, sales, transactions, team, invitations };
  }

  static async inviteUser(userId: string, payload: unknown) { const m = await this.getPrimaryStore(userId); const data = inviteSchema.parse(payload); const token = EmailService.generateToken(); const invitation = await prisma.storeInvitation.create({ data: { storeId: m.storeId, email: data.email, role: data.role, permissions: data.permissions, token, invitedById: userId, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) } }); await EmailService.sendInvitationEmail(data.email, token, m.store.name); return invitation; }
  static async acceptInvite(userId: string, token: string) { const invitation = await prisma.storeInvitation.findUnique({ where: { token } }); if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) throw new Error('Convite inválido ou expirado'); await prisma.storeMember.upsert({ where: { storeId_userId: { storeId: invitation.storeId, userId } }, update: { role: invitation.role, permissions: invitation.permissions }, create: { storeId: invitation.storeId, userId, role: invitation.role, permissions: invitation.permissions } }); return prisma.storeInvitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } }); }
}
