import { ParsedPix } from '@/types/pix';
import { bankParsers } from './banks';
import { detectBank, detectBankWithConfidence } from './bankDetector';
import { calculateConfidence, isConfidenceAcceptable, CONFIDENCE_THRESHOLD } from './confidenceService';
import { extractWithAIFallback, extractWithLocalAIOnly } from '@/lib/ai/aiFallbackService';

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
  console.log('[ParserOrchestrator] Starting parse...');
  // Logar as linhas capturadas do comprovante
  try {
    const { extractLines } = await import('@/lib/ocr/normalizeText');
    const lines = extractLines(text);
    console.log('[ParserOrchestrator] Linhas capturadas:', lines);
  } catch (e) {
    console.warn('[ParserOrchestrator] Não foi possível logar as linhas capturadas:', e);
  }

  // Opção 1: Usar banco específico
  if (options.specificBank) {
    console.log(`[ParserOrchestrator] Using specific bank: ${options.specificBank}`);
    return parseWithSpecificBank(text, options.specificBank, options);
  }

  // Opção 2: Forçar uso de IA
  if (options.forceAI) {
    console.log('[ParserOrchestrator] Force AI mode');
    if (options.localOnly) {
      return extractWithLocalAIOnly(text);
    }
    return extractWithAIFallback(text);
  }

  // Fluxo normal: detectar banco e usar parser específico
  const detectedBank = detectBankWithConfidence(text);
  console.log(`[ParserOrchestrator] Detected bank: ${detectedBank.bank} (confidence: ${detectedBank.confidence})`);
  if (detectedBank.matchedKeywords && detectedBank.matchedKeywords.length > 0) {
    console.log(`[ParserOrchestrator] Palavras-chave encontradas para o banco:`, detectedBank.matchedKeywords);
  } else {
    console.log('[ParserOrchestrator] Nenhuma palavra-chave específica encontrada para o banco detectado.');
  }

  // Se banco não detectado ou confiança baixa, ir direto para completar com IA
  if (detectedBank.bank === 'desconhecido' || detectedBank.confidence < 0.5) {
    console.log('[ParserOrchestrator] Decisão: banco não detectado ou confiança baixa. Iniciando completion com IA.');
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
    console.log(`[ParserOrchestrator] Decisão: não existe parser para o banco ${detectedBank.bank}. Iniciando completion com IA.`);
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
  console.log(`[ParserOrchestrator] Decisão: parser encontrado para o banco ${parser.bankName}. Usando parser específico.`);
  const result = parser.parse(text);

  console.log(`[ParserOrchestrator] Resultado do parser:`, result);
  console.log(`[ParserOrchestrator] Confiança do parser: ${result.confidence}`);

  // Se confidence for aceitável, retornar
  if (isConfidenceAcceptable(result.confidence)) {
    console.log('[ParserOrchestrator] Decisão: confiança suficiente, retornando resultado do parser.');
      console.log('[ParserOrchestrator] Resultado final retornado:', result);
      return result;
  }

  // Se confidence baixa, tentar completar com IA
  console.log(`[ParserOrchestrator] Decisão: confiança baixa (${result.confidence}), tentando completar com IA.`);
  return completeWithAI(result, text, options);
}

/**
 * Completa um resultado de parsing tentando múltiplas IAsSistematicamente
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

  console.log('[ParserOrchestrator] Iniciando completion loop...');

  while (attempts < maxAttempts && !isComplete(current)) {
    attempts++;
    console.log(`[ParserOrchestrator] Attempt ${attempts}/${maxAttempts} - Current completeness:`, {
      banco: !!current.banco,
      valor: !!current.valor,
      data: !!current.data,
      pagador: !!current.pagador,
      recebedor: !!current.recebedor,
      txId: !!current.txId,
    });

    let aiResult: ParsedPix | null = null;

    try {
      if (attempts === 1 && !options.localOnly) {
        // Primeira tentativa: IA externa (Gemini, Groq, etc)
        console.log('[ParserOrchestrator] Tentando IA externa...');
        aiResult = await extractWithAIFallback(text);
      } else if (attempts <= 2 && !options.localOnly) {
        // Segunda tentativa: SimpleAI
        console.log('[ParserOrchestrator] Tentando IA local (SimpleAI)...');
        aiResult = extractWithLocalAIOnly(text);
      } else {
        // Se localOnly ou esgotou tentativas externas, usar SimpleAI
        console.log('[ParserOrchestrator] Tentando SimpleAI...');
        aiResult = extractWithLocalAIOnly(text);
      }
    } catch (error) {
      console.warn(`[ParserOrchestrator] Erro na tentativa ${attempts}:`, (error as Error).message);
      // Continuar para próxima tentativa
      continue;
    }

    // Mesclar resultado atual com resultado da IA
    if (aiResult) {
      current = mergeResults(current, aiResult);
      console.log(`[ParserOrchestrator] Após merge (attempt ${attempts}):`, {
        confidence: current.confidence,
        completeness: isComplete(current),
      });
    }

    // Se conseguiu completar, sair do loop
    if (isComplete(current)) {
      console.log('[ParserOrchestrator] Resultado completado com sucesso!');
      break;
    }
  }

  if (!isComplete(current)) {
    console.log('[ParserOrchestrator] Não foi possível completar todos os campos após', maxAttempts, 'tentativas');
  }

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
 * Retorna confidence 1 se todos os campos estão preenchidos
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

  console.log(`[ParserOrchestrator] Merged result confidence: ${merged.confidence}`);

  return merged;
}

/**
 * Faz parsing apenas com detecção de banco (sem fallback IA)
 * Mais rápido, mas pode ter menor precisão
 */
export function parseWithBankDetectionOnly(text: string): ParsedPix {
  const detectedBank = detectBankWithConfidence(text);

  if (detectedBank.bank === 'desconhecido') {
    // Usar heurísticas genéricas
    return extractWithLocalAIOnly(text);
  }

  const parser = bankParsers.find(
    (p) => p.bankName.toLowerCase() === detectedBank.bank.toLowerCase()
  );

  if (!parser) {
    return extractWithLocalAIOnly(text);
  }

  return parser.parse(text);
}

/**
 * Retorna estatísticas sobre o parsing
 */
export function getParserStats(): {
  supportedBanks: string[];
  totalParsers: number;
  confidenceThreshold: number;
} {
  return {
    supportedBanks: bankParsers.map((p) => p.bankName),
    totalParsers: bankParsers.length,
    confidenceThreshold: CONFIDENCE_THRESHOLD,
  };
}
