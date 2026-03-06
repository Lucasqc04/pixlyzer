import { prisma } from '@/lib/prisma';

export class ReconciliationService {
  static async matchUploadToSales(uploadId: string) {
    const upload = await prisma.upload.findUnique({ where: { id: uploadId } });
    if (!upload || !upload.valor) return [];

    const userMembership = await prisma.storeMember.findFirst({ where: { userId: upload.userId }, orderBy: { createdAt: 'asc' } });
    if (!userMembership) return [];

    const lower = upload.valor * 0.99;
    const upper = upload.valor * 1.01;
    const sales = await prisma.sale.findMany({ where: { storeId: userMembership.storeId, status: { in: ['PENDING', 'UNPAID'] }, total: { gte: lower, lte: upper } }, include: { customer: true }, take: 20, orderBy: { createdAt: 'desc' } });

    await prisma.possibleUploadMatch.deleteMany({ where: { uploadId } });

    const now = upload.data || upload.createdAt;
    const rows = sales.map((sale) => {
      let score = 0;
      const paidValue = sale.total - sale.discount + sale.freight;
      const diff = Math.abs((upload.valor || 0) - paidValue);
      if (diff <= 0.01) score += 60;
      else if (diff <= upload.valor! * 0.01) score += 45;
      if (upload.pagador && sale.customer?.name && upload.pagador.toLowerCase().includes(sale.customer.name.toLowerCase())) score += 20;
      const days = Math.abs((now.getTime() - sale.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      if (days <= 1) score += 20;
      else if (days <= 3) score += 10;
      return { uploadId, saleId: sale.id, confidenceScore: Math.min(100, score) };
    }).filter((x) => x.confidenceScore > 0);

    if (rows.length) await prisma.possibleUploadMatch.createMany({ data: rows });
    await prisma.upload.update({ where: { id: uploadId }, data: { matchStatus: rows.length ? 'SUGGESTED' : 'NONE' } });
    return prisma.possibleUploadMatch.findMany({ where: { uploadId }, include: { sale: { include: { customer: true } } }, orderBy: { confidenceScore: 'desc' } });
  }

  static async confirmMatch(uploadId: string, saleId: string) {
    const upload = await prisma.upload.findUnique({ where: { id: uploadId } });
    if (!upload) throw new Error('Upload não encontrado');
    const sale = await prisma.sale.findUnique({ where: { id: saleId } });
    if (!sale) throw new Error('Venda não encontrada');

    const total = sale.total - sale.discount + sale.freight;
    await prisma.sale.update({ where: { id: saleId }, data: { status: 'PAID' } });

    const hasTx = await prisma.transaction.findFirst({ where: { saleId, source: 'OCR_PIX' } });
    let txId = hasTx?.id;
    if (!hasTx) {
      const tx = await prisma.transaction.create({ data: { storeId: sale.storeId, saleId, kind: 'INCOME', source: 'OCR_PIX', description: `Pagamento reconciliado ${sale.id.slice(0,8)}`, amount: total, category: 'SALES', status: 'CONFIRMED', paidAt: upload.data || new Date(), reference: upload.txId || undefined } });
      txId = tx.id;
    }

    await prisma.upload.update({ where: { id: uploadId }, data: { linkedSaleId: saleId, linkedTransactionId: txId, matchStatus: 'CONFIRMED', reviewStatus: 'REVIEWED' } });
    await prisma.possibleUploadMatch.deleteMany({ where: { uploadId } });
    return { saleId, transactionId: txId };
  }
}
