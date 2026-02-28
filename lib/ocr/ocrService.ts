import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import tesseract from 'node-tesseract-ocr';
import { OCRResult, OCROptions, OCRError } from '@/types/pix';
import { normalizeText } from './normalizeText';
import fetch from 'node-fetch';

/**
 * OCR Service - Processamento de imagens usando Tesseract nativo
 * 
 * Este serviço:
 * 1. Recebe buffer de imagem
 * 2. Processa com Tesseract nativo
 * 3. Normaliza o texto extraído
 * 4. Retorna texto limpo para parsing
 * 
 * IMPORTANTE: salva em arquivo temporario no sistema e remove logo apos.
 * O buffer e descartado apos o processamento.
 */

// Configurações padrão
const DEFAULT_OPTIONS: Required<OCROptions> = {
  language: 'por',
  timeout: 30000, // 30 segundos para OCR
};

// Tamanho máximo de imagem (5MB)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// Tipos MIME permitidos
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
};

/**
 * Processa uma imagem e extrai texto usando OCR
 * @param imageBuffer - Buffer da imagem (JPEG/PNG)
 * @param options - Opções de OCR
 * @returns Texto extraído e confiança
 */
export async function processImage(
  imageBuffer: Buffer,
  options: OCROptions = {}
): Promise<OCRResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Se variável de ambiente OCR_SERVER_URL estiver definida, usa API externa
  const ocrServerUrl = process.env.OCR_SERVER_URL || '';
  if (ocrServerUrl) {
    try {
      // Validar buffer localmente antes de enviar
      const mimeType = validateImageBuffer(imageBuffer);
      const formData = new (require('form-data'))();
      formData.append('file', imageBuffer, {
        filename: `image${EXTENSION_BY_MIME[mimeType] || '.img'}`,
        contentType: mimeType,
      });
      if (opts.language) formData.append('language', opts.language);
      if (opts.timeout) formData.append('timeout', String(opts.timeout));

      // node-fetch não suporta timeout nativo no options, precisa de AbortController
      const controller = new AbortController();
      let timeoutId: NodeJS.Timeout | undefined;
      if (opts.timeout && opts.timeout > 0) {
        timeoutId = setTimeout(() => controller.abort(), opts.timeout);
      }
      const response = await fetch(`${ocrServerUrl.replace(/\/$/, '')}/ocr`, {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders(),
        signal: controller.signal,
      });
      if (timeoutId) clearTimeout(timeoutId);
      if (!response.ok) {
        const text = await response.text();
        throw new OCRError(`OCR server error: ${response.status} ${text}`, 'OCR_SERVER_ERROR', response.status);
      }
      const result = (await response.json()) as Partial<OCRResult>;
      // Garante compatibilidade
      return {
        text: result.text || '',
        confidence: typeof result.confidence === 'number' ? result.confidence : 100,
      };
    } catch (error: any) {
      console.error('[OCRService] OCR server error:', error);
      if (error instanceof OCRError) throw error;
      throw new OCRError(
        `OCR server request failed: ${error.message}`,
        'OCR_SERVER_ERROR',
        502
      );
    }
  }

  // Fallback: processamento local
  console.log('[OCRService] Starting local OCR processing...');
  try {
    const mimeType = validateImageBuffer(imageBuffer);
    const tempFilePath = await writeTempImageFile(imageBuffer, mimeType);
    try {
      const rawText = await withTimeout(
        tesseract.recognize(tempFilePath, {
          lang: opts.language,
          oem: 1,
          psm: 3,
        }),
        opts.timeout
      );
      console.log('[OCRService] Local OCR completed.');
      const normalizedText = normalizeText(rawText);
      return {
        text: normalizedText,
        confidence: 100,
      };
    } finally {
      await safeUnlink(tempFilePath);
      imageBuffer.fill(0);
    }
  } catch (error: any) {
    console.error('[OCRService] Local OCR error:', error);
    if (error instanceof OCRError) throw error;
    throw new OCRError(
      `Local OCR processing failed: ${error.message}`,
      'OCR_ERROR',
      500
    );
  }
}

/**
 * Valida o buffer da imagem
 * @param buffer - Buffer a validar
 */
function validateImageBuffer(buffer: Buffer): string {
  // Verificar se é um buffer válido
  if (!Buffer.isBuffer(buffer)) {
    throw new OCRError(
      'Invalid input: expected Buffer',
      'INVALID_INPUT',
      400
    );
  }

  // Verificar tamanho
  if (buffer.length === 0) {
    throw new OCRError(
      'Empty image buffer',
      'EMPTY_BUFFER',
      400
    );
  }

  if (buffer.length > MAX_IMAGE_SIZE) {
    throw new OCRError(
      `Image too large: ${(buffer.length / 1024 / 1024).toFixed(2)}MB (max: 5MB)`,
      'IMAGE_TOO_LARGE',
      400
    );
  }

  // Verificar tipo MIME pela assinatura do arquivo (magic numbers)
  const mimeType = detectMimeType(buffer);
  
  if (!mimeType) {
    throw new OCRError(
      'Unable to detect image type',
      'UNKNOWN_IMAGE_TYPE',
      400
    );
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new OCRError(
      `Invalid image type: ${mimeType}. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`,
      'INVALID_IMAGE_TYPE',
      400
    );
  }

  console.log(`[OCRService] Image validated: ${mimeType}, ${buffer.length} bytes`);

  return mimeType;
}

/**
 * Detecta o tipo MIME de uma imagem pela assinatura (magic numbers)
 * @param buffer - Buffer da imagem
 * @returns Tipo MIME ou null
 */
function detectMimeType(buffer: Buffer): string | null {
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && 
      buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }

  return null;
}

/**
 * Verifica se um arquivo é uma imagem válida
 * @param buffer - Buffer do arquivo
 * @returns true se for imagem válida
 */
export function isValidImage(buffer: Buffer): boolean {
  try {
    validateImageBuffer(buffer);
    return true;
  } catch {
    return false;
  }
}

async function writeTempImageFile(buffer: Buffer, mimeType: string): Promise<string> {
  const extension = EXTENSION_BY_MIME[mimeType] ?? '.img';
  const fileName = `pixlyzer-ocr-${crypto.randomUUID()}${extension}`;
  const tempFilePath = path.join(os.tmpdir(), fileName);

  await fs.writeFile(tempFilePath, buffer);
  return tempFilePath;
}

async function safeUnlink(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch {
    // ignore cleanup errors
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
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

/**
 * Retorna informações sobre o buffer da imagem
 * @param buffer - Buffer da imagem
 * @returns Informações da imagem
 */
export function getImageInfo(buffer: Buffer): {
  size: number;
  sizeMB: string;
  mimeType: string | null;
  valid: boolean;
} {
  const mimeType = detectMimeType(buffer);
  
  return {
    size: buffer.length,
    sizeMB: (buffer.length / 1024 / 1024).toFixed(2),
    mimeType,
    valid: mimeType !== null && ALLOWED_MIME_TYPES.includes(mimeType),
  };
}

/**
 * Processa múltiplas imagens em paralelo
 * @param buffers - Array de buffers de imagem
 * @param options - Opções de OCR
 * @returns Array de resultados
 */
export async function processMultipleImages(
  buffers: Buffer[],
  options: OCROptions = {}
): Promise<OCRResult[]> {
  console.log(`[OCRService] Processing ${buffers.length} images in parallel...`);

  const promises = buffers.map((buffer, index) => 
    processImage(buffer, options).catch((error) => {
      console.error(`[OCRService] Error processing image ${index}:`, error);
      // Retornar resultado vazio em caso de erro
      return {
        text: '',
        confidence: 0,
      };
    })
  );

  return Promise.all(promises);
}
