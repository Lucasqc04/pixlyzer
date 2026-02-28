import { ParsedPix, BankParser } from '@/types/pix';
import { calculateConfidence } from '../confidenceService';
import { extractValor, extractData, extractTxId, extractNome } from './bancoTemplate';

/**
 * Parser para comprovantes CORPX BANK
 */
export const corpxBankParser: BankParser = {
  bankName: 'CORPX BANK',

  detect(text: string): boolean {
    const lower = text.toLowerCase();
    return lower.includes('corpx bank instituicao de pagamento');
  },

  parse(text: string): ParsedPix {
    const valor = extractValor(text);
    const data = extractData(text);
    const txId = extractTxId(text);
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
