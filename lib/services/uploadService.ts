import { prisma } from '@/lib/prisma';
import { processImage } from '@/lib/ocr';
import { PixParserService} from './pixParserService';

export interface UploadResult {
  id: string;
  valor?: number | null;
  data?: Date | null;
  banco?: string | null;
  pagador?: string | null;
  recebedor?: string | null;
  txId?: string | null;
  rawText: string | null;
  fileName?: string | null;
  fileType?: string | null;
  createdAt: Date;
}

export class UploadService {
  static async processUpload(
    userId: string,
    fileBuffer: Buffer,
    fileName: string,
    fileType: string
  ): Promise<UploadResult> {
    // Executar OCR
    const ocrResult = await processImage(fileBuffer);

    // Parse dos dados PIX (agora assíncrono)
    const parsedData = await PixParserService.parse(ocrResult.text);

    // Converter data para Date se necessário
    let dataToSave: Date | undefined = undefined;
    if (parsedData.data) {
      // Se já for Date, mantém. Se for string, converte.
      dataToSave = typeof parsedData.data === 'string' ? new Date(parsedData.data) : parsedData.data;
      // Se a string não for válida, dataToSave será Invalid Date, então valida:
      if (dataToSave instanceof Date && Number.isNaN(dataToSave.getTime())) {
        dataToSave = undefined;
      }
    }

    // Normalizar valor: se valor > 1000 e o texto original indica valor baixo, dividir por 100
    let valorNormalizado = parsedData.valor;
    if (valorNormalizado && valorNormalizado > 1000 && ocrResult.text) {
      // Procurar valor no texto original (ex: R$ 109,15)
      const match = ocrResult.text.match(/R\$\s*([\d.]+,[\d]{2})/);
      if (match) {
        const valorTexto = parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
        // Se diferença for de 100x, corrigir
        if (Math.abs(valorNormalizado - valorTexto * 100) < 1) {
          valorNormalizado = valorNormalizado / 100;
        }
      }
    }

    const upload = await prisma.upload.create({
      data: {
        userId,
        valor: valorNormalizado,
        data: dataToSave,
        banco: parsedData.banco,
        pagador: parsedData.pagador,
        recebedor: parsedData.recebedor,
        txId: parsedData.txId,
        rawText: parsedData.rawText,
        fileName,
        fileType,
      },
    });

    return {
      id: upload.id,
      valor: upload.valor || undefined,
      data: upload.data || undefined,
      banco: upload.banco || undefined,
      pagador: upload.pagador || undefined,
      recebedor: upload.recebedor || undefined,
      txId: upload.txId || undefined,
      rawText: upload.rawText || '',
      createdAt: upload.createdAt,
    };
  }

  static async processUploadWithApiKey(
    apiKey: string,
    fileBuffer: Buffer,
    fileName: string,
    fileType: string
  ): Promise<UploadResult> {
    // Buscar usuário pela API key
    const apiKeys = await prisma.apiKey.findMany({
      where: { revoked: false },
      include: { user: true },
    });

    const bcrypt = await import('bcryptjs');
    let userId: string | null = null;

    for (const key of apiKeys) {
      const isMatch = await bcrypt.compare(apiKey, key.keyHash);
      if (isMatch) {
        userId = key.userId;
        break;
      }
    }

    if (!userId) {
      throw new Error('API Key inválida');
    }

    return this.processUpload(userId, fileBuffer, fileName, fileType);
  }

  static async getUploadById(uploadId: string, userId: string): Promise<UploadResult | null> {
    const upload = await prisma.upload.findFirst({
      where: { id: uploadId, userId },
    });
    if (!upload) return null;
    return {
      id: upload.id,
      valor: upload.valor,
      data: upload.data,
      banco: upload.banco,
      pagador: upload.pagador,
      recebedor: upload.recebedor,
      txId: upload.txId,
      rawText: upload.rawText,
      fileName: upload.fileName,
      fileType: upload.fileType,
      createdAt: upload.createdAt,
    };
  }

  static async deleteUpload(uploadId: string, userId: string): Promise<void> {
    const upload = await prisma.upload.findFirst({
      where: { id: uploadId, userId },
    });

    if (!upload) {
      throw new Error('Upload não encontrado');
    }

    await prisma.upload.delete({
      where: { id: uploadId },
    });
  }

  static async getUserUploads(userId: string, skip: number = 0, take: number = 50): Promise<UploadResult[]> {
    const uploads = await prisma.upload.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    });
    return uploads.map(upload => ({
      id: upload.id,
      valor: upload.valor,
      data: upload.data,
      banco: upload.banco,
      pagador: upload.pagador,
      recebedor: upload.recebedor,
      txId: upload.txId,
      rawText: upload.rawText,
      fileName: upload.fileName,
      fileType: upload.fileType,
      createdAt: upload.createdAt,
    }));
  }

  static async getUploadsSummary(userId: string) {
    const uploads = await prisma.upload.findMany({
      where: { userId },
    });

    const totalValor = uploads.reduce((sum, upload) => sum + (upload.valor || 0), 0);
    const totalUploads = uploads.length;

    // Agrupar por banco
    const byBanco = uploads.reduce((acc, upload) => {
      const banco = upload.banco || 'Desconhecido';
      if (!acc[banco]) {
        acc[banco] = { count: 0, total: 0 };
      }
      acc[banco].count++;
      acc[banco].total += upload.valor || 0;
      return acc;
    }, {} as Record<string, { count: number; total: number }>);

    return {
      totalValor,
      totalUploads,
      byBanco,
    };
  }
}
