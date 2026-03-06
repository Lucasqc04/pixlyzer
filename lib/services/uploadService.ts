import { prisma } from '@/lib/prisma';
import { processImage } from '@/lib/ocr';
import { PixParserService } from './pixParserService';
import { ReconciliationService } from './reconciliationService';
import { AuditService } from './auditService';

export interface UploadResult {
  id: string; valor?: number | null; data?: Date | null; banco?: string | null; pagador?: string | null; recebedor?: string | null; txId?: string | null; rawText: string | null;
  fileName?: string | null; fileType?: string | null; imageData?: string | null; reviewStatus?: string; matchStatus?: string; createdAt: Date;
}

export class UploadService {
  static async processUpload(userId: string, fileBuffer: Buffer, fileName: string, fileType: string): Promise<UploadResult> {
    const ocrResult = await processImage(fileBuffer);
    const parsedData = await PixParserService.parse(ocrResult.text);
    let dataToSave: Date | undefined = parsedData.data ? (typeof parsedData.data === 'string' ? new Date(parsedData.data) : parsedData.data) : undefined;
    if (dataToSave && Number.isNaN(dataToSave.getTime())) dataToSave = undefined;

    let valorNormalizado = parsedData.valor;
    if (valorNormalizado && valorNormalizado > 1000 && ocrResult.text) {
      const match = /R\$\s*([\d.]+,\d{2})/.exec(ocrResult.text);
      if (match) {
        const valorTexto = Number.parseFloat(match[1].replaceAll('.', '').replace(',', '.'));
        if (Math.abs(valorNormalizado - valorTexto * 100) < 1) valorNormalizado = valorNormalizado / 100;
      }
    }

    const upload = await prisma.upload.create({
      data: {
        userId, valor: valorNormalizado, data: dataToSave, banco: parsedData.banco, pagador: parsedData.pagador, recebedor: parsedData.recebedor,
        txId: parsedData.txId, rawText: parsedData.rawText, fileName, fileType, imageData: fileBuffer.toString('base64'), reviewStatus: 'PENDING', matchStatus: 'NONE',
      },
    });

    await ReconciliationService.matchUploadToSales(upload.id);
    await AuditService.log({ userId, entityType: 'UPLOAD', entityId: upload.id, action: 'CREATE', changes: { valor: upload.valor, banco: upload.banco } });

    return { id: upload.id, valor: upload.valor, data: upload.data, banco: upload.banco, pagador: upload.pagador, recebedor: upload.recebedor, txId: upload.txId, rawText: upload.rawText, imageData: upload.imageData, reviewStatus: String(upload.reviewStatus), matchStatus: String(upload.matchStatus), createdAt: upload.createdAt };
  }

  static async processUploadWithApiKey(apiKey: string, fileBuffer: Buffer, fileName: string, fileType: string): Promise<UploadResult> {
    const apiKeys = await prisma.apiKey.findMany({ where: { revoked: false }, include: { user: true } });
    const bcrypt = await import('bcryptjs');
    let userId: string | null = null;
    for (const key of apiKeys) { const isMatch = await bcrypt.compare(apiKey, key.keyHash); if (isMatch) { userId = key.userId; break; } }
    if (!userId) throw new Error('API Key inválida');
    return this.processUpload(userId, fileBuffer, fileName, fileType);
  }

  static async getUserUploads(userId: string, skip = 0, take = 50): Promise<UploadResult[]> {
    const uploads = await prisma.upload.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, skip, take });
    return uploads.map((u) => ({ id: u.id, valor: u.valor, data: u.data, banco: u.banco, pagador: u.pagador, recebedor: u.recebedor, txId: u.txId, rawText: u.rawText, fileName: u.fileName, fileType: u.fileType, imageData: u.imageData, reviewStatus: String(u.reviewStatus), matchStatus: String(u.matchStatus), createdAt: u.createdAt }));
  }

  static async getUploadsSummary(userId: string) {
    const uploads = await prisma.upload.findMany({ where: { userId } });
    const totalValor = uploads.reduce((sum, upload) => sum + (upload.valor || 0), 0);
    const totalUploads = uploads.length;
    const byBanco = uploads.reduce((acc, upload) => { const banco = upload.banco || 'Desconhecido'; if (!acc[banco]) acc[banco] = { count: 0, total: 0 }; acc[banco].count++; acc[banco].total += upload.valor || 0; return acc; }, {} as Record<string, { count: number; total: number }>);
    const pending = uploads.filter((u) => String(u.reviewStatus) === 'PENDING').length;
    const reconciled = uploads.filter((u) => String(u.matchStatus) === 'CONFIRMED').length;
    return { totalValor, totalUploads, byBanco, pending, reconciled };
  }
}
