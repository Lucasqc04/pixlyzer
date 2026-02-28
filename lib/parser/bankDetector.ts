import { BankParser } from '@/types/pix';

/**
 * Sistema de Detecção de Banco
 * 
 * Analisa o texto OCR e identifica qual banco emitiu o comprovante
 * baseado em palavras-chave, logos, e padrões específicos.
 * 
 * Cada banco tem um conjunto de palavras-chave que o identificam
 * de forma única no comprovante.
 */

// Mapeamento de palavras-chave por banco
// Cada banco tem múltiplas variações para aumentar a precisão
const BANK_KEYWORDS: Record<string, string[]> = {
  nubank: [
    'nubank',
    'nu bank',
    'nubank pagamentos',
    'nu pagamentos',
    '@nubank',
    'nubank s.a.',
  ],
  itau: [
    'itaú',
    'itau',
    'itau unibanco',
    'itaú unibanco',
    'banco itaú',
    'banco itau',
  ],
  bradesco: [
    'bradesco',
    'banco bradesco',
    'bradesco sa',
    'bradesco s.a.',
  ],
  santander: [
    'santander',
    'banco santander',
    'santander brasil',
  ],
  bb: [
    'banco do brasil',
    'banco do brasil s.a.',
    'bb',
    'banco brasil',
  ],
  caixa: [
    'caixa',
    'caixa econômica',
    'caixa econômica federal',
    'cef',
    'caixa econômica fed.',
  ],
  inter: [
    'inter',
    'banco inter',
    'inter medium',
    'banco intermedium',
  ],
  c6: [
    'c6 bank',
    'c6bank',
    'banco c6',
    'c6',
  ],
  original: [
    'original',
    'banco original',
    'original bank',
  ],
  picpay: [
    'picpay',
    'pic pay',
    'banco picpay',
  ],
  mercadopago: [
    'mercado pago',
    'mercadopago',
    'mp',
    'mercado livre',
  ],
  pagbank: [
    'pagbank',
    'pag bank',
    'pagseguro',
    'banco pagbank',
  ],
};

/**
 * Detecta o banco baseado no texto do comprovante
 * @param text - Texto normalizado do OCR
 * @returns Nome do banco detectado ou 'desconhecido'
 */
export function detectBank(text: string): string {
  const lowerText = text.toLowerCase();
  
  // Pontuação para cada banco
  const scores: Record<string, number> = {};

  // Verificar palavras-chave de cada banco
  for (const [bank, keywords] of Object.entries(BANK_KEYWORDS)) {
    scores[bank] = 0;
    
    for (const keyword of keywords) {
      // Contar ocorrências da palavra-chave
      const regex = new RegExp(keyword.toLowerCase(), 'g');
      const matches = lowerText.match(regex);
      
      if (matches) {
        // Palavras mais específicas (mais longas) têm peso maior
        const weight = keyword.length / 10;
        scores[bank] += matches.length * weight;
      }
    }
  }

  // Encontrar banco com maior pontuação
  let bestBank = 'desconhecido';
  let bestScore = 0;

  for (const [bank, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestBank = bank;
    }
  }

  // Threshold mínimo para considerar uma detecção válida
  // Evita falsos positivos quando nenhum banco é claramente identificado
  if (bestScore < 0.5) {
    return 'desconhecido';
  }

  return bestBank;
}

/**
 * Detecta o banco e retorna informações adicionais
 * @param text - Texto normalizado do OCR
 * @returns Objeto com banco detectado e confiança
 */
export function detectBankWithConfidence(text: string): {
  bank: string;
  confidence: number;
  matchedKeywords: string[];
} {
  const lowerText = text.toLowerCase();
  const scores: Record<string, { score: number; keywords: string[] }> = {};

  // Calcular scores
  for (const [bank, keywords] of Object.entries(BANK_KEYWORDS)) {
    scores[bank] = { score: 0, keywords: [] };
    
    for (const keyword of keywords) {
      const regex = new RegExp(keyword.toLowerCase(), 'g');
      const matches = lowerText.match(regex);
      
      if (matches) {
        const weight = keyword.length / 10;
        scores[bank].score += matches.length * weight;
        scores[bank].keywords.push(keyword);
      }
    }
  }

  // Encontrar melhor match
  let bestBank = 'desconhecido';
  let bestScore = 0;
  let matchedKeywords: string[] = [];

  for (const [bank, data] of Object.entries(scores)) {
    if (data.score > bestScore) {
      bestScore = data.score;
      bestBank = bank;
      matchedKeywords = data.keywords;
    }
  }

  // Calcular confiança (0-1)
  // Score > 2 é considerado alta confiança
  const confidence = Math.min(bestScore / 2, 1);

  return {
    bank: bestScore < 0.5 ? 'desconhecido' : bestBank,
    confidence: Math.round(confidence * 100) / 100,
    matchedKeywords,
  };
}

/**
 * Verifica se um texto contém referências a múltiplos bancos
 * Útil para detectar possíveis confusões
 * @param text - Texto normalizado
 * @returns Array de bancos detectados
 */
export function detectMultipleBanks(text: string): string[] {
  const lowerText = text.toLowerCase();
  const detected: string[] = [];

  for (const [bank, keywords] of Object.entries(BANK_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        detected.push(bank);
        break; // Banco detectado, ir para próximo
      }
    }
  }

  return Array.from(new Set(detected)); // Remover duplicatas
}

/**
 * Retorna o nome formatado do banco para exibição
 * @param bankKey - Chave do banco (ex: 'nubank')
 * @returns Nome formatado (ex: 'NUBANK')
 */
export function getBankDisplayName(bankKey: string): string {
  const displayNames: Record<string, string> = {
    nubank: 'NUBANK',
    itau: 'Itaú',
    bradesco: 'Bradesco',
    santander: 'Santander',
    bb: 'Banco do Brasil',
    caixa: 'Caixa Econômica',
    inter: 'Banco Inter',
    c6: 'C6 Bank',
    original: 'Banco Original',
    picpay: 'PicPay',
    mercadopago: 'Mercado Pago',
    pagbank: 'PagBank',
    desconhecido: 'Desconhecido',
  };

  return displayNames[bankKey] || bankKey.toUpperCase();
}
