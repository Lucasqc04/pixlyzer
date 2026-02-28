import { ParsedPix, BankParser } from '@/types/pix';
import { calculateConfidence } from '../confidenceService';
import { extractValor, extractData, extractTxId, extractNome } from './bancoTemplate';

/**
 * Parser para comprovantes Mercado Pago
 */
export const mercadoPagoParser: BankParser = {
  bankName: 'MERCADO PAGO',

  detect(text: string): boolean {
    const lower = text.toLowerCase();
    return (
      lower.includes('mercado pago') ||
      lower.includes('psp: 323') ||
      lower.includes('atendimento ao cliente 0800 637 7246')
    );
  },

  parse(text: string): ParsedPix {
    const valor = extractValor(text);
    const data = extractData(text);
    const txId = extractTxId(text) || (text.match(/c[oó]digo de autentica[cç][aã]o[\s:]+([A-Z0-9]{10,})/i)?.[1] ?? undefined);
    const pagador = extractNome(text, 'de') || extractNome(text, 'pagador');
    const recebedor = extractNome(text, 'para') || extractNome(text, 'favorecido');

    const result: ParsedPix = {
      banco: this.bankName,
      valor,
      data,
      pagador,
      recebedor,
      txId,
      rawText: text.substring(0, 1000),
      confidence: 0,
    };
    result.confidence = calculateConfidence(result);
    return result;
  },
};
