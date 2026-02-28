import { ParsedPix } from '@/types/pix';

/**
 * Sistema de Confidence Score para avaliar a qualidade da extração de dados
 * 
 * O confidence score varia de 0.0 a 1.0 e é calculado baseado na
 * presença e validade dos campos extraídos.
 * 
 * Regras de pontuação:
 * - valor: +0.3 (campo crítico, fácil de validar)
 * - data: +0.3 (campo crítico, formato padronizado)
 * - txId: +0.2 (campo importante, formato específico)
 * - pagador: +0.1 (campo secundário)
 * - recebedor: +0.1 (campo secundário)
 * 
 * Threshold recomendado: 0.8 (80% de confiança)
 */

// Pesos para cada campo
const FIELD_WEIGHTS = {
  valor: 0.3,
  data: 0.3,
  txId: 0.2,
  pagador: 0.1,
  recebedor: 0.1,
} as const;

// Threshold de confiança mínima para aceitar resultado sem fallback
export const CONFIDENCE_THRESHOLD = 0.8;

/**
 * Calcula o confidence score baseado nos campos presentes
 * @param parsed - Dados extraídos
 * @returns Score entre 0.0 e 1.0
 */
export function calculateConfidence(parsed: ParsedPix): number {
  let score = 0;

  // Verificar valor (deve ser número positivo)
  if (isValidValor(parsed.valor)) {
    score += FIELD_WEIGHTS.valor;
  }

  // Verificar data (deve ser data válida)
  if (isValidData(parsed.data)) {
    score += FIELD_WEIGHTS.data;
  }

  // Verificar txId (deve ter formato específico)
  if (isValidTxId(parsed.txId)) {
    score += FIELD_WEIGHTS.txId;
  }

  // Verificar pagador (deve ser string não vazia)
  if (isValidNome(parsed.pagador)) {
    score += FIELD_WEIGHTS.pagador;
  }

  // Verificar recebedor (deve ser string não vazia)
  if (isValidNome(parsed.recebedor)) {
    score += FIELD_WEIGHTS.recebedor;
  }

  // Arredondar para 2 casas decimais
  return Math.round(score * 100) / 100;
}

/**
 * Valida se o valor é um número positivo válido
 * @param valor - Valor a validar
 * @returns true se válido
 */
function isValidValor(valor: number | undefined): boolean {
  if (valor === undefined || valor === null) return false;
  if (typeof valor !== 'number') return false;
  if (isNaN(valor)) return false;
  if (valor <= 0) return false;
  // Valor máximo razoável para PIX (R$ 1 milhão)
  if (valor > 1000000) return false;
  return true;
}

/**
 * Valida se a data está em formato válido
 * @param data - Data a validar (formato ISO YYYY-MM-DD)
 * @returns true se válida
 */
function isValidData(data: string | undefined): boolean {
  if (!data || typeof data !== 'string') return false;
  
  // Regex para formato ISO: YYYY-MM-DD
  // ^\d{4} - ano com 4 dígitos
  // -\d{2} - mês com 2 dígitos
  // -\d{2}$ - dia com 2 dígitos
  const isoRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoRegex.test(data)) return false;

  // Verificar se é data válida (não pode ser 2024-13-45)
  const date = new Date(data);
  if (isNaN(date.getTime())) return false;

  // Verificar se não é data futura (com tolerância de 1 dia)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date > tomorrow) return false;

  // Verificar se não é data muito antiga (antes de 2020)
  const minDate = new Date('2020-01-01');
  if (date < minDate) return false;

  return true;
}

/**
 * Valida se o txId tem formato válido
 * @param txId - ID da transação a validar
 * @returns true se válido
 */
function isValidTxId(txId: string | undefined): boolean {
  if (!txId || typeof txId !== 'string') return false;
  
  // TX ID do PIX: alfanumérico, mínimo 20 caracteres, máximo 35
  // Pode conter letras maiúsculas e números
  // Regex: [A-Z0-9]{20,35}
  const txIdRegex = /^E?[A-Z0-9]{20,50}$/i;
  if (!txIdRegex.test(txId)) return false;

  return true;
}

/**
 * Valida se o nome é uma string válida
 * @param nome - Nome a validar
 * @returns true se válido
 */
function isValidNome(nome: string | undefined): boolean {
  if (!nome || typeof nome !== 'string') return false;
  
  const trimmed = nome.trim();
  
  // Mínimo 2 caracteres
  if (trimmed.length < 2) return false;
  
  // Máximo 100 caracteres
  if (trimmed.length > 100) return false;
  
  // Deve conter pelo menos uma letra
  // Regex: [a-zA-Z] - pelo menos uma letra
  if (!/[a-zA-Z]/.test(trimmed)) return false;

  return true;
}

/**
 * Verifica se o confidence score atinge o threshold mínimo
 * @param confidence - Score a verificar
 * @returns true se >= threshold
 */
export function isConfidenceAcceptable(confidence: number): boolean {
  return confidence >= CONFIDENCE_THRESHOLD;
}

/**
 * Retorna uma mensagem explicativa sobre o confidence score
 * @param confidence - Score calculado
 * @returns Mensagem descritiva
 */
export function getConfidenceMessage(confidence: number): string {
  if (confidence >= 0.9) {
    return 'Excelente - Dados altamente confiáveis';
  } else if (confidence >= 0.8) {
    return 'Bom - Dados confiáveis';
  } else if (confidence >= 0.6) {
    return 'Regular - Alguns campos podem estar incompletos';
  } else if (confidence >= 0.4) {
    return 'Baixo - Vários campos ausentes ou inválidos';
  } else {
    return 'Muito baixo - Dados provavelmente incorretos';
  }
}

/**
 * Retorna campos que faltam ou são inválidos
 * @param parsed - Dados extraídos
 * @returns Array com nomes dos campos problemáticos
 */
export function getMissingFields(parsed: ParsedPix): string[] {
  const missing: string[] = [];

  if (!isValidValor(parsed.valor)) {
    missing.push('valor');
  }
  if (!isValidData(parsed.data)) {
    missing.push('data');
  }
  if (!isValidTxId(parsed.txId)) {
    missing.push('txId');
  }
  if (!isValidNome(parsed.pagador)) {
    missing.push('pagador');
  }
  if (!isValidNome(parsed.recebedor)) {
    missing.push('recebedor');
  }

  return missing;
}
