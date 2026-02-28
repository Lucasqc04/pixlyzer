/**
 * Normaliza texto para parsing de comprovantes
 * Remove caracteres estranhos, deixa uppercase e normaliza espaços
 */
export function normalizeComprovanteText(text: string): string {
  return text
    .replace(/[«»“”‘’|\[\]\(\)\-—–•·…]/g, ' ')
    .replace(/[^\w\s@\.,:;\/\-]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase()
    .trim();
}
import { ParsedPix, BankParser } from '@/types/pix';
import { calculateConfidence } from '../confidenceService';

/**
 * TEMPLATE PARA NOVOS BANCOS
 * 
 * Este arquivo serve como modelo para implementar parsers de novos bancos.
 * Para adicionar um novo banco:
 * 
 * 1. Copie este arquivo
 * 2. Renomeie para o nome do banco (ex: sicredi.ts)
 * 3. Implemente as funções detect() e parse()
 * 4. Exporte o objeto parser
 * 5. Adicione ao index.ts
 * 
 * NÃO é necessário modificar o parserOrchestrator!
 */

/**
 * Regex comuns úteis para todos os parsers:
 * 
 * VALOR:
 * - R\$\s*(\d+[.,]?\d{0,2}) - Captura valor após R$
 * - (\d+[.,]\d{2})\s*(?:reais|R\$) - Valor seguido de "reais"
 * 
 * DATA BRASILEIRA:
 * - (\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4}) - DD/MM/AAAA
 * - (\d{2})\s+de\s+(\w+)\s+de\s+(\d{4}) - 15 de janeiro de 2024
 * 
 * TX ID:
 * - ([A-Z0-9]{20,35}) - Alfanumérico de 20-35 caracteres
 * - (?:txid|id|transa[cç][aã]o)[\s:]+([A-Z0-9]+) - Após label
 * 
 * NOME:
 * - (?:de|para|pagador|recebedor)[\s:]+([A-Za-z\s]+) - Após label
 */

/**
 * NOME_DO_BANCO Parser
 * Substitua NOME_DO_BANCO pelo nome real do banco
 */
export const nomeDoBancoParser: BankParser = {
  bankName: 'NOME_DO_BANCO',

  /**
   * Detecta se o texto pertence a este banco
   * Procure por palavras-chave únicas do banco
   */
  detect(text: string): boolean {
    const lowerText = text.toLowerCase();
    
    // Adicione palavras-chave específicas do banco
    const keywords = [
      'nome do banco',
      'logomarca',
      'texto específico',
    ];

    return keywords.some((keyword) => lowerText.includes(keyword));
  },

  /**
   * Extrai dados estruturados do comprovante
   * Implemente regex específicas para o layout do banco
   */
  parse(text: string): ParsedPix {
    const normalizedText = text;

    // Extrair valor
    // Exemplo: R$ 150,00 ou R$150,00 ou 150,00
    const valorMatch = normalizedText.match(/R\$\s*(\d+[.,]?\d{0,2})/i);
    const valor = valorMatch ? parseFloat(valorMatch[1].replace(',', '.')) : undefined;

    // Extrair data
    // Exemplo: 15/01/2024 ou 15-01-2024
    const dataMatch = normalizedText.match(/(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})/);
    const data = dataMatch 
      ? `${dataMatch[3]}-${dataMatch[2]}-${dataMatch[1]}` 
      : undefined;

    // Extrair TX ID
    // Exemplo: ABC123DEF456 (20-35 caracteres alfanuméricos)
    const txIdMatch = normalizedText.match(/([A-Z0-9]{20,35})/i);
    const txId = txIdMatch ? txIdMatch[1].toUpperCase() : undefined;

    // Extrair pagador
    // Exemplo: "De: João Silva" ou "Pagador: João Silva"
    const pagadorMatch = normalizedText.match(/(?:de|pagador)[\s:]+([A-Za-z\s]+?)(?:\n|$)/i);
    const pagador = pagadorMatch ? pagadorMatch[1].trim() : undefined;

    // Extrair recebedor
    // Exemplo: "Para: Maria Silva" ou "Recebedor: Maria Silva"
    const recebedorMatch = normalizedText.match(/(?:para|recebedor|favorecido)[\s:]+([A-Za-z\s]+?)(?:\n|$)/i);
    const recebedor = recebedorMatch ? recebedorMatch[1].trim() : undefined;

    const result: ParsedPix = {
      banco: this.bankName,
      valor,
      data,
      pagador,
      recebedor,
      txId,
      rawText: text.substring(0, 1000), // Limitar tamanho
      confidence: 0, // Será calculado depois
    };

    // Calcular confidence baseado nos campos extraídos
    result.confidence = calculateConfidence(result);

    return result;
  },
};

/**
 * Funções utilitárias para parsers
 */

/**
 * Extrai valor monetário de vários formatos possíveis
 */
export function extractValor(text: string): number | undefined {
  // R$ 150,00 | R$150,00 | R$ 1.234,56
  const match1 = text.match(/R\$\s*([\d.]+,\d{2})/i);
  if (match1) {
    return parseFloat(match1[1].replace(/\./g, '').replace(',', '.'));
  }

  // 150,00 reais | 150.00 reais
  const match2 = text.match(/([\d.,]+)\s*reais/i);
  if (match2) {
    return parseFloat(match2[1].replace(/\./g, '').replace(',', '.'));
  }

  // Valor: 150,00
  const match3 = text.match(/valor[\s:]+([\d.,]+)/i);
  if (match3) {
    return parseFloat(match3[1].replace(/\./g, '').replace(',', '.'));
  }

  return undefined;
}

/**
 * Extrai data em formato ISO
 */
export function extractData(text: string): string | undefined {
  const compactText = text.replace(/(\d)\s+(\d)/g, '$1$2');
  // DD/MM/AAAA
  const match1 = compactText.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match1) {
    return `${match1[3]}-${match1[2]}-${match1[1]}`;
  }

  // DD-MM-AAAA
  const match2 = compactText.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (match2) {
    return `${match2[3]}-${match2[2]}-${match2[1]}`;
  }

  // DD.MM.AAAA
  const match3 = compactText.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (match3) {
    return `${match3[3]}-${match3[2]}-${match3[1]}`;
  }

  return undefined;
}

/**
 * Extrai TX ID
 */
export function extractTxId(text: string): string | undefined {
  const compactText = text.replace(/([A-Z0-9])\s+([A-Z0-9])/gi, '$1$2');
  // TX ID explícito
  const match1 = compactText.match(
    /(?:txid|tx id|id\/transa[cç][aã]o|id transa[cç][aã]o|id da transa[cç][aã]o)[\s:]+(E?[A-Z0-9]{20,50})/i
  );
  if (match1) {
    return match1[1].toUpperCase();
  }

  // Código alfanumérico longo (20-35 chars)
  const match2 = compactText.match(/\b(E?[A-Z0-9]{20,50})\b/i);
  if (match2) {
    return match2[1].toUpperCase();
  }

  return undefined;
}

/**
 * Extrai nome de pessoa
 */
export function extractNome(text: string, label: string): string | undefined {
  const regex = new RegExp(`${label}[\s:]+([A-Za-zÀ-ÖØ-öø-ÿ\s]+?)(?:\n|$|CPF|CNPJ|INSTITUI[CÇ][AÃ]O|AG[EÊ]NCIA|CONTA)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : undefined;
}
