import { ParsedPix, BankParser } from '@/types/pix';
import { calculateConfidence } from '../confidenceService';
import { parseValorString } from './bancoTemplate';
import { normalizeBankName } from '../bankNormalization';

/**
 * Parser para comprovantes PagBank/PagSeguro
 */
export const pagbankParser: BankParser = {
  bankName: 'PAGBANK',

  detect(text: string): boolean {
    const norm = text.toUpperCase();
    // Palavras-chave fortes para Pagbank
    return (
      norm.includes('COMPROVANTE DE PAGAMENTO PIX') ||
      norm.includes('PAGBANK') ||
      norm.includes('PAGSEGURO INTERNET') ||
      norm.includes('CÓDIGO DA TRANSAÇÃO PAGBANK')
    );
  },

  parse(text: string): ParsedPix {
    // Normalização para facilitar regex e evitar problemas de OCR
    const norm = text.replaceAll(/\s+/g, ' ').toUpperCase();

    // Valor: "VALOR DO PAGAMENTO R$ X" ou "R$ X"
    let valor: number | undefined;
    let valorMatch = /VALOR DO PAGAMENTO[:\s]*R?\$\s*([\d.,]+)/.exec(norm);
    valorMatch ??= /R?\$\s*([\d.,]+)/.exec(norm);
    if (valorMatch) {
      valor = parseValorString(valorMatch[1]);
    }

    // Data: "DD/MM/AAAA ÀS HH:MM:SS"
    let data: string | undefined;
    const dataMatch = /(\d{2})\/(\d{2})\/(\d{4})\s+ÀS\s+\d{2}:\d{2}:\d{2}/.exec(norm);
    if (dataMatch) {
      data = `${dataMatch[3]}-${dataMatch[2]}-${dataMatch[1]}`;
    }

    // TX ID: "CÓDIGO DA TRANSAÇÃO PIX" (começa com E)
    let txId: string | undefined;
    const txIdMatch = /CÓDIGO DA TRANSAÇÃO PIX[:\s]+(E[0-9A-Z]{20,})/.exec(norm);
    if (txIdMatch) {
      txId = txIdMatch[1];
    }

    // Pagador: após "DE" até "CNPJ"/"CPF"/"INSTITUIÇÃO"
    let pagador: string | undefined;
    const pagadorMatch = /DE[:\s]+([A-ZÀ-ÖØ-öø-ÿ\s]+?)(?= CNPJ| CPF| INSTITUIÇÃO|$)/.exec(norm);
    if (pagadorMatch) {
      pagador = pagadorMatch[1].trim();
    }

    // Recebedor: após "PARA" até "CNPJ"/"CPF"/"INSTITUIÇÃO"
    let recebedor: string | undefined;
    const recebedorMatch = /PARA[:\s]+([A-ZÀ-ÖØ-öø-ÿ\s]+?)(?= CNPJ| CPF| INSTITUIÇÃO|$)/.exec(norm);
    if (recebedorMatch) {
      recebedor = recebedorMatch[1].trim();
    }

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
