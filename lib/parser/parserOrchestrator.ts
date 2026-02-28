import type { ParsedPix } from '@/types/pix';
import { bankParsers } from './banks';
import { detectBankWithConfidence } from './bankDetector';
import { calculateConfidence, isConfidenceAcceptable } from './confidenceService';
import { extractWithAIFallback, extractWithLocalAIOnly } from '@/lib/ai/aiFallbackService';
import { normalizeBankName } from './bankNormalization';
import { logSafe, logErrorSafe } from '@/lib/utils/logging';

/**
 * Parser Orchestrator - Coordena todo o fluxo de parsing
 * 
 * Fluxo completo:
 * 1. Detectar banco do comprovante
 * 2. Se banco conhecido → usar parser específico
 * 3. Calcular confidence score
 * 4. Se confidence >= 0.8 → retornar resultado
 * 5. Se confidence < 0.8 → executar fallback IA
 * 6. Retornar melhor resultado
 * 
 * Este arquivo NÃO precisa ser modificado ao adicionar novos bancos!
 * Basta adicionar o parser ao array bankParsers em banks/index.ts
 */

export interface ParseOptions {
  /** Forçar uso de IA mesmo com parser específico */
  forceAI?: boolean;
  /** Usar apenas heurísticas locais (sem APIs externas) */
  localOnly?: boolean;
  /** Banco específico a usar (ignora detecção) */
  specificBank?: string;
}

/**
 * Orquestra o parsing completo de um comprovante PIX
 * @param text - Texto normalizado do OCR
 * @param options - Opções de parsing
 * @returns Dados estruturados extraídos
 */
export async function orchestrateParse(
  text: string, 
  options: ParseOptions = {}
): Promise<ParsedPix> {
  logSafe('[ParserOrchestrator] Started parsing...');

  // Opção 1: Usar banco específico
  if (options.specificBank) {
    logSafe(`[ParserOrchestrator] Using specific bank: ${options.specificBank}`);
    return parseWithSpecificBank(text, options.specificBank, options);
  }

  // Opção 2: Forçar uso de IA
  if (options.forceAI) {
    logSafe('[ParserOrchestrator] Force AI mode');
    if (options.localOnly) {
      return extractWithLocalAIOnly(text);
    }
    return extractWithAIFallback(text);
  }

  // Fluxo normal: detectar banco e usar parser específico
  const detectedBank = detectBankWithConfidence(text);

  // Se banco não detectado ou confiança baixa, ir direto para completar com IA
  if (detectedBank.bank === 'desconhecido' || detectedBank.confidence < 0.5) {
    if (options.localOnly) {
      return extractWithLocalAIOnly(text);
    }
    // Criar resultado vazio e tentar completar com IA
    const emptyResult: ParsedPix = {
      banco: 'DESCONHECIDO',
      valor: undefined,
      data: undefined,
      pagador: undefined,
      recebedor: undefined,
      txId: undefined,
      rawText: text.substring(0, 1000),
      confidence: 0,
    };
    return completeWithAI(emptyResult, text, options);
  }

  // Encontrar parser para o banco detectado
  const parser = bankParsers.find(
    (p) => p.bankName.toLowerCase() === detectedBank.bank.toLowerCase()
  );

  if (!parser) {
    if (options.localOnly) {
      return extractWithLocalAIOnly(text);
    }
    // Criar resultado com banco detectado e tentar completar com IA
    const emptyResult: ParsedPix = {
      banco: detectedBank.bank,
      valor: undefined,
      data: undefined,
      pagador: undefined,
      recebedor: undefined,
      txId: undefined,
      rawText: text.substring(0, 1000),
      confidence: 0,
    };
    return completeWithAI(emptyResult, text, options);
  }

  // Usar parser específico do banco
  const result = parser.parse(text);
  
  // Normalizar nome do banco extraído
  const normalizedBanco = normalizeBankName(result.banco);

  logSafe('[ParserOrchestrator] Bank parser result:', {
    banco: normalizedBanco,
    valor: result.valor,
    data: result.data,
    pagador: result.pagador,
    recebedor: result.recebedor,
    txId: result.txId,
    confidence: result.confidence,
  });

  // Se confidence for aceitável, retornar
  if (isConfidenceAcceptable(result.confidence)) {
    const finalResult = { ...result, banco: normalizedBanco || 'DESCONHECIDO' };
    logSafe('[ParserOrchestrator] Final result (bank parser):', {
      banco: finalResult.banco,
      valor: finalResult.valor,
      data: finalResult.data,
      pagador: finalResult.pagador,
      recebedor: finalResult.recebedor,
      txId: finalResult.txId,
      confidence: finalResult.confidence,
    });
    return finalResult;
  }

  // Se confidence baixa, tentar completar com IA
  result.banco = normalizedBanco || 'DESCONHECIDO';
  return completeWithAI(result, text, options);
}

/**
 * Completa um resultado de parsing tentando múltiplas IAs
 * até conseguir precision = 1 (todos os campos preenchidos)
 */
async function completeWithAI(
  partialResult: ParsedPix,
  text: string,
  options: ParseOptions
): Promise<ParsedPix> {
  let current = partialResult;
  let attempts = 0;
  const maxAttempts = 3;

  while (attempts < maxAttempts && !isComplete(current)) {
    attempts++;

    let aiResult: ParsedPix | null = null;

    try {
      if (attempts === 1 && !options.localOnly) {
        // Primeira tentativa: IA externa (Gemini, Groq, etc)
        aiResult = await extractWithAIFallback(text);
      } else if (attempts <= 2 && !options.localOnly) {
        // Segunda tentativa: SimpleAI
        aiResult = extractWithLocalAIOnly(text);
      } else {
        // Se localOnly ou esgotou tentativas externas, usar SimpleAI
        aiResult = extractWithLocalAIOnly(text);
      }

      if (aiResult) {
        const normalizedAIBanco = normalizeBankName(aiResult.banco) || 'DESCONHECIDO';
        
        logSafe('[ParserOrchestrator] AI result:', {
          banco: normalizedAIBanco,
          valor: aiResult.valor,
          data: aiResult.data,
          pagador: aiResult.pagador,
          recebedor: aiResult.recebedor,
          txId: aiResult.txId,
          confidence: aiResult.confidence,
        });

        aiResult.banco = normalizedAIBanco;

        current = mergeResults(current, aiResult);

        logSafe('[ParserOrchestrator] Merge decision:', {
          usedBank: current.banco,
          usedValor: current.valor,
          usedData: current.data,
          usedPagador: current.pagador,
          usedRecebedor: current.recebedor,
          usedTxId: current.txId,
          finalConfidence: current.confidence,
        });
      }
    } catch (error) {
      // Continuar para próxima tentativa
      logErrorSafe('[ParserOrchestrator] Error in AI extraction:', error);
    }

    // Se conseguiu completar, sair do loop
    if (isComplete(current)) {
      break;
    }
  }

  logSafe('[ParserOrchestrator] Final result (after AI completion):', {
    banco: current.banco,
    valor: current.valor,
    data: current.data,
    pagador: current.pagador,
    recebedor: current.recebedor,
    txId: current.txId,
    confidence: current.confidence,
  });

  return current;
}

/**
 * Faz parsing usando um banco específico
 */
async function parseWithSpecificBank(
  text: string,
  bankName: string,
  options: ParseOptions
): Promise<ParsedPix> {
  const parser = bankParsers.find(
    (p) => p.bankName.toLowerCase() === bankName.toLowerCase()
  );

  if (!parser) {
    throw new Error(`Bank parser not found: ${bankName}`);
  }

  const result = parser.parse(text);

  if (isConfidenceAcceptable(result.confidence)) {
    return result;
  }

  // Se não completo, tentar completar com IA
  return completeWithAI(result, text, options);
}

/**
 * Verifica se um resultado tem todos os campos obrigatórios preenchidos
 */
function isComplete(result: ParsedPix): boolean {
  return !!(
    result.banco &&
    result.banco !== 'DESCONHECIDO' &&
    result.valor &&
    result.valor > 0 &&
    result.data &&
    result.pagador &&
    result.recebedor &&
    result.txId &&
    result.rawText
  );
}

/**
 * Mescla resultados do parser específico com IA
 * Prioriza o parser, mas preenche campos faltantes com IA
 */
function mergeResults(parserResult: ParsedPix, aiResult: ParsedPix): ParsedPix {
  const merged: ParsedPix = {
    banco: parserResult.banco && parserResult.banco !== 'DESCONHECIDO' ? parserResult.banco : aiResult.banco,
    valor: parserResult.valor ?? aiResult.valor,
    data: parserResult.data ?? aiResult.data,
    pagador: parserResult.pagador ?? aiResult.pagador,
    recebedor: parserResult.recebedor ?? aiResult.recebedor,
    txId: parserResult.txId ?? aiResult.txId,
    rawText: parserResult.rawText,
    confidence: 0,
  };

  // Se todos os campos estão preenchidos, confidence = 1
  if (isComplete(merged)) {
    merged.confidence = 1;
  } else {
    // Recalcular confidence baseado nos campos preenchidos
    merged.confidence = calculateConfidence(merged);
  }

  return merged;
}

/**
 * Retorna estatísticas sobre o parsing
 */
export function getParserStats(): {
  supportedBanks: string[];
  totalParsers: number;
} {
  return {
    supportedBanks: bankParsers.map((p) => p.bankName),
    totalParsers: bankParsers.length,
  };
}
