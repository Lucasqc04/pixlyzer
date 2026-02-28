import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import tesseract from 'node-tesseract-ocr';
import { OCRResult, OCROptions, OCRError } from '../types/pix';
import { normalizeText } from './normalizeText';

/**
 * OCR Service - Processamento de imagens usando Tesseract nativo
 *
 * Este servico:
 * 1. Recebe buffer de imagem
 * 2. Processa com Tesseract nativo
 * 3. Normaliza o texto extraido
 * 4. Retorna texto limpo para parsing
 *
 * IMPORTANTE: salva em arquivo temporario no sistema e remove logo apos.
 * O buffer e descartado apos o processamento.
 */

// Configuracoes padrao
const DEFAULT_OPTIONS: Required<OCROptions> = {
  language: 'por',
  timeout: 30000, // 30 segundos para OCR
};

// Tamanho maximo de imagem (5MB)
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// Tipos MIME permitidos
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
};

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  /**
   * Processa uma imagem e extrai texto usando OCR
   * @param imageBuffer - Buffer da imagem (JPEG/PNG)
   * @param options - Opcoes de OCR
   * @returns Texto extraido e confianca
   */
  async processImage(
    imageBuffer: Buffer,
    options: OCROptions = {}
  ): Promise<OCRResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    this.logger.log('Starting OCR processing...');

    try {
      // Validar buffer
      const mimeType = this.validateImageBuffer(imageBuffer);

      const tempFilePath = await this.writeTempImageFile(imageBuffer, mimeType);

      try {
        // Executar OCR usando Tesseract nativo
        const rawText = await this.withTimeout(
          tesseract.recognize(tempFilePath, {
            lang: opts.language,
            oem: 1,
            psm: 3,
          }),
          opts.timeout
        );

        this.logger.log('OCR completed. Confidence: not available');

        // Normalizar texto
        const normalizedText = normalizeText(rawText);

        return {
          text: normalizedText,
          // node-tesseract-ocr nao expoe confianca; manter compatibilidade.
          confidence: 100,
        };
      } finally {
        await this.safeUnlink(tempFilePath);
        // Limpar buffer da memoria (ajuda GC)
        imageBuffer.fill(0);
      }
    } catch (error: any) {
      this.logger.error('OCR error', error?.stack || error);

      if (error instanceof OCRError) {
        throw error;
      }

      throw new OCRError(
        `OCR processing failed: ${error.message}`,
        'OCR_ERROR',
        500
      );
    }
  }

  /**
   * Verifica se um arquivo e uma imagem valida
   * @param buffer - Buffer do arquivo
   * @returns true se for imagem valida
   */
  isValidImage(buffer: Buffer): boolean {
    try {
      this.validateImageBuffer(buffer);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Retorna informacoes sobre o buffer da imagem
   * @param buffer - Buffer da imagem
   * @returns Informacoes da imagem
   */
  getImageInfo(buffer: Buffer): {
    size: number;
    sizeMB: string;
    mimeType: string | null;
    valid: boolean;
  } {
    const mimeType = this.detectMimeType(buffer);

    return {
      size: buffer.length,
      sizeMB: (buffer.length / 1024 / 1024).toFixed(2),
      mimeType,
      valid: mimeType !== null && ALLOWED_MIME_TYPES.includes(mimeType),
    };
  }

  /**
   * Processa multiplas imagens em paralelo
   * @param buffers - Array de buffers de imagem
   * @param options - Opcoes de OCR
   * @returns Array de resultados
   */
  async processMultipleImages(
    buffers: Buffer[],
    options: OCROptions = {}
  ): Promise<OCRResult[]> {
    this.logger.log(`Processing ${buffers.length} images in parallel...`);

    const promises = buffers.map((buffer, index) =>
      this.processImage(buffer, options).catch((error) => {
        this.logger.error(`Error processing image ${index}`, error);
        // Retornar resultado vazio em caso de erro
        return {
          text: '',
          confidence: 0,
        };
      })
    );

    return Promise.all(promises);
  }

  /**
   * Valida o buffer da imagem
   * @param buffer - Buffer a validar
   */
  private validateImageBuffer(buffer: Buffer): string {
    // Verificar se e um buffer valido
    if (!Buffer.isBuffer(buffer)) {
      throw new OCRError('Invalid input: expected Buffer', 'INVALID_INPUT', 400);
    }

    // Verificar tamanho
    if (buffer.length === 0) {
      throw new OCRError('Empty image buffer', 'EMPTY_BUFFER', 400);
    }

    if (buffer.length > MAX_IMAGE_SIZE) {
      throw new OCRError(
        `Image too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB (max: 5MB)`,
        'IMAGE_TOO_LARGE',
        400
      );
    }

    // Verificar tipo MIME pela assinatura do arquivo (magic numbers)
    const mimeType = this.detectMimeType(buffer);

    if (!mimeType) {
      throw new OCRError('Unable to detect image type', 'UNKNOWN_IMAGE_TYPE', 400);
    }

    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new OCRError(
        `Invalid image type: ${mimeType}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
        'INVALID_IMAGE_TYPE',
        400
      );
    }

    this.logger.log(`Image validated: ${mimeType}, ${buffer.length} bytes`);

    return mimeType;
  }

  /**
   * Detecta o tipo MIME de uma imagem pela assinatura (magic numbers)
   * @param buffer - Buffer da imagem
   * @returns Tipo MIME ou null
   */
  private detectMimeType(buffer: Buffer): string | null {
    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return 'image/jpeg';
    }

    // PNG: 89 50 4E 47
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return 'image/png';
    }

    return null;
  }

  private async writeTempImageFile(buffer: Buffer, mimeType: string): Promise<string> {
    const extension = EXTENSION_BY_MIME[mimeType] ?? '.img';
    const fileName = `pixlyzer-ocr-${crypto.randomUUID()}${extension}`;
    const tempFilePath = path.join(os.tmpdir(), fileName);

    await fs.writeFile(tempFilePath, buffer);
    return tempFilePath;
  }

  private async safeUnlink(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch {
      // ignore cleanup errors
    }
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    if (!timeoutMs || timeoutMs <= 0) {
      return promise;
    }

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new OCRError('OCR timeout', 'OCR_TIMEOUT', 504));
      }, timeoutMs);

      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }
}
