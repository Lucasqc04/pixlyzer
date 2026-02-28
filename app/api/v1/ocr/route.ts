import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { processImage } from '@/lib/ocr';
import { orchestrateParse } from '@/lib/parser';
import { ApiKeyService } from '@/lib/services/apiKeyService';
import { OCRError } from '@/types/pix';
import { logErrorSafe } from '@/lib/utils/logging';

export const runtime = 'nodejs';

/**
 * API OCR v1 - Processamento de comprovantes PIX
 * 
 * Fluxo:
 * 1. Validar API Key
 * 2. Validar arquivo (tamanho, tipo)
 * 3. Processar OCR
 * 4. Parse dos dados
 * 5. Retornar JSON estruturado
 * 
 * Segurança:
 * - Nunca salva a imagem
 * - Processa apenas em memória
 * - Destrói buffer após uso
 * - Rate limiting por API key
 * - Validação rigorosa de inputs
 */

// Schema de validação do request
const ocrRequestSchema = z.object({
  file: z.instanceof(File).refine(
    (file) => file.size > 0,
    'File cannot be empty'
  ).refine(
    (file) => file.size <= 5 * 1024 * 1024,
    'File size must be less than 5MB'
  ).refine(
    (file) => ['image/jpeg', 'image/png', 'image/jpg'].includes(file.type),
    'Only JPEG and PNG files are allowed'
  ),
});

// Rate limiting simples (em memória)
// Em produção, use Redis ou similar
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

/**
 * POST /api/v1/ocr
 * Processa uma imagem de comprovante PIX
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // 1. Validar API Key
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'API_KEY_REQUIRED',
          message: 'Header x-api-key is required' 
        },
        { status: 401 }
      );
    }

    // Validar formato da API key
    if (!apiKey.startsWith('sk_live_') && !apiKey.startsWith('sk_test_')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'INVALID_KEY_FORMAT',
          message: 'Invalid API key format' 
        },
        { status: 401 }
      );
    }

    // Verificar rate limit
    const rateLimitResult = checkRateLimit(apiKey);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded. Max ${RATE_LIMIT} requests per minute.` 
        },
        { status: 429 }
      );
    }

    // Validar API key no banco
    const validation = await ApiKeyService.validateApiKey(apiKey);
    
    if (!validation.valid) {
      const status = validation.error === 'LIMIT_EXCEEDED' ? 429 : 401;
      return NextResponse.json(
        { 
          success: false, 
          error: validation.error,
          message: 'Invalid or expired API key' 
        },
        { status }
      );
    }

    // 2. Processar multipart form data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'INVALID_FORM_DATA',
          message: 'Invalid form data' 
        },
        { status: 400 }
      );
    }

    const file = formData.get('file');

    // 3. Validar arquivo
    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'FILE_REQUIRED',
          message: 'File is required in field "file"' 
        },
        { status: 400 }
      );
    }

    // Validação adicional de segurança
    const validationResult = validateFile(file);
    if (!validationResult.valid) {
      return NextResponse.json(
        { 
          success: false, 
          error: validationResult.error,
          message: validationResult.message 
        },
        { status: 400 }
      );
    }

    // 4. Converter arquivo para buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 5. Processar OCR
    console.log(`[API OCR] Processing file: ${file.name}, ${buffer.length} bytes`);
    
    const ocrResult = await processImage(buffer);

    // Verificar se OCR teve confiança mínima
    if (ocrResult.confidence < 30) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'OCR_LOW_CONFIDENCE',
          message: 'OCR confidence too low. Please provide a clearer image.',
          data: {
            ocrConfidence: ocrResult.confidence,
          }
        },
        { status: 422 }
      );
    }

    // 6. Parse dos dados
    const parsedData = await orchestrateParse(ocrResult.text);

    // 7. Incrementar uso da API key
    await ApiKeyService.incrementUsage(apiKey);

    // 8. Retornar resposta
    const processingTime = Date.now() - startTime;
    
    console.log(`[API OCR] Completed in ${processingTime}ms. Confidence: ${parsedData.confidence}`);

    return NextResponse.json({
      success: true,
      data: {
        banco: parsedData.banco,
        valor: parsedData.valor,
        data: parsedData.data,
        pagador: parsedData.pagador,
        recebedor: parsedData.recebedor,
        txId: parsedData.txId,
        confidence: parsedData.confidence,
      },
      meta: {
        processingTimeMs: processingTime,
        ocrConfidence: ocrResult.confidence,
      },
    });

  } catch (error: any) {
    logErrorSafe('[API OCR] Error:', error);

    // Não expor detalhes internos em produção
    const isDev = process.env.NODE_ENV === 'development';

    if (error instanceof OCRError) {
      return NextResponse.json(
        { 
          success: false, 
          error: error.code,
          message: error.message,
          ...(isDev && { stack: error.stack }),
        },
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        ...(isDev && { 
          details: error.message,
          stack: error.stack,
        }),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/ocr
 * Retorna informações sobre o endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/v1/ocr',
    method: 'POST',
    description: 'Process PIX payment receipt images and extract structured data',
    headers: {
      required: ['x-api-key'],
      'x-api-key': 'Your API key (starts with sk_live_ or sk_test_)',
    },
    body: {
      contentType: 'multipart/form-data',
      fields: {
        file: 'Image file (JPEG/PNG, max 5MB)',
      },
    },
    response: {
      success: true,
      data: {
        banco: 'Bank name',
        valor: 'Transaction amount',
        data: 'Transaction date (YYYY-MM-DD)',
        pagador: 'Payer name',
        recebedor: 'Receiver name',
        txId: 'Transaction ID',
        confidence: 'Confidence score (0-1)',
      },
    },
    errors: {
      'API_KEY_REQUIRED': 401,
      'INVALID_KEY_FORMAT': 401,
      'INVALID_KEY': 401,
      'LIMIT_EXCEEDED': 429,
      'RATE_LIMIT_EXCEEDED': 429,
      'FILE_REQUIRED': 400,
      'IMAGE_TOO_LARGE': 400,
      'INVALID_IMAGE_TYPE': 400,
      'OCR_LOW_CONFIDENCE': 422,
      'INTERNAL_ERROR': 500,
    },
  });
}

/**
 * Valida arquivo de forma segura
 */
function validateFile(file: File): { valid: boolean; error?: string; message?: string } {
  // Verificar tamanho (máximo 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return {
      valid: false,
      error: 'IMAGE_TOO_LARGE',
      message: 'File size must be less than 5MB',
    };
  }

  // Verificar tipo MIME
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'INVALID_IMAGE_TYPE',
      message: `File type ${file.type} not allowed. Allowed: ${allowedTypes.join(', ')}`,
    };
  }

  // Verificar extensão do arquivo
  const allowedExtensions = ['.jpg', '.jpeg', '.png'];
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: 'INVALID_IMAGE_TYPE',
      message: `File extension ${extension} not allowed`,
    };
  }

  // Verificar nome do arquivo (prevenir path traversal)
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    return {
      valid: false,
      error: 'INVALID_FILE_NAME',
      message: 'Invalid file name',
    };
  }

  return { valid: true };
}

/**
 * Verifica rate limit
 */
function checkRateLimit(apiKey: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(apiKey);

  if (!record || now > record.resetTime) {
    // Nova janela
    rateLimitMap.set(apiKey, {
      count: 1,
      resetTime: now + RATE_WINDOW,
    });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }

  if (record.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT - record.count };
}
