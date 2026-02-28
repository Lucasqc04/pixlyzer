import { ParsedPix, BankParser } from '@/types/pix';
import { calculateConfidence } from '../confidenceService';
import { extractValor, extractData, extractTxId, extractNome } from './bancoTemplate';
import { normalizeBankName } from '../bankNormalization';

/**
 * Parser para comprovantes CELCOIN IP S.A.
 */
export const celcoinParser: BankParser = {
  bankName: 'CELCOIN',

  detect(text: string): boolean {
    const lower = text.toLowerCase();
    return lower.includes('celcoin ip s.a.') || lower.includes('banco celcoin');
  },

  parse(text: string): ParsedPix {
    const valor = extractValor(text);
    const data = extractData(text);
    const txId = extractTxId(text);
    const pagador = extractNome(text, 'de') || extractNome(text, 'pagador');
    const recebedor = extractNome(text, 'para') || extractNome(text, 'favorecido');

    const result: ParsedPix = {
      banco: normalizeBankName(this.bankName) || 'DESCONHECIDO',
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
